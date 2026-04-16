import axios from "axios";
import https from "https";
import { generateAccessKey } from "./access-key.generator";
import { buildInvoiceXML } from "./xml.generator";
import { signXML } from "./xml.signer";
import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import { companyRepository } from "@/modules/company/company.repository";
import type { InvoiceForXML } from "@/types";

// In development, SRI's test environment uses self-signed or untrusted certs
const httpsAgent =
  process.env.NODE_ENV !== "production"
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

// ─── SRI Endpoint URLs (from .env) ───────────────────────────────────────────
function getSRIEndpoints() {
  return {
    PRUEBAS: {
      recepcion:
        process.env.SRI_WS_RECEPCION_PRUEBAS ??
        "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
      autorizacion:
        process.env.SRI_WS_AUTORIZACION_PRUEBAS ??
        "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
    },
    PRODUCCION: {
      recepcion:
        process.env.SRI_WS_RECEPCION_PRODUCCION ??
        "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
      autorizacion:
        process.env.SRI_WS_AUTORIZACION_PRODUCCION ??
        "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
    },
  };
}

const USE_MOCK = process.env.SRI_USE_MOCK !== "false";

export const sriService = {
  /**
   * Full SRI processing pipeline:
   * 1. Generate access key
   * 2. Build XML
   * 3. Sign XML
   * 4. Send to SRI (reception)
   * 5. Authorize (if received)
   */
  async processInvoice(invoiceId: string, companyId: string) {
    const invoice = await invoiceRepository.findById(invoiceId, companyId);
    if (!invoice) throw new Error("Factura no encontrada");

    if (invoice.estado === "AUTORIZADO") {
      throw new Error("La factura ya está autorizada");
    }

    const certificate = await companyRepository.getActiveCertificate(companyId);
    if (!certificate) {
      throw new Error("No hay certificado digital activo. Configure su certificado .p12");
    }

    // ── Step 1: Generate or reuse access key ─────────────────────────────
    // Per SRI spec: DEVUELTA/RECHAZADO must reuse the same claveAcceso.
    // For new invoices: use the company's sequential codigoNumerico (atomic increment).
    let claveAcceso: string;
    if (
      (invoice.estado === "DEVUELTA" || invoice.estado === "RECHAZADO") &&
      invoice.claveAcceso
    ) {
      claveAcceso = invoice.claveAcceso;
    } else {
      const codigoNumerico = await companyRepository.getNextCodigoNumerico(companyId);
      claveAcceso = generateAccessKey({
        fechaEmision: invoice.fechaEmision,
        ruc: invoice.company.ruc,
        ambiente: invoice.company.ambiente,
        estab: invoice.company.estab,
        ptoEmi: invoice.company.ptoEmi,
        secuencial: invoice.secuencial,
        codigoNumerico,
      });
    }

    await invoiceRepository.updateSRI(invoiceId, { claveAcceso });
    invoice.claveAcceso = claveAcceso;

    // ── Step 2: Build XML ─────────────────────────────────────────────────
    const xmlData: InvoiceForXML = { invoice };
    const xmlGenerado = buildInvoiceXML(xmlData);
    await invoiceRepository.updateSRI(invoiceId, { xmlGenerado });

    // ── Step 3: Sign XML ──────────────────────────────────────────────────
    let xmlFirmado: string;
    try {
      xmlFirmado = signXML({
        certificateData: Buffer.from(certificate.fileData),
        certificatePassword: certificate.password,
        xmlContent: xmlGenerado,
      });
    } catch (err) {
      throw new Error(
        `Error al firmar el XML: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    await invoiceRepository.updateSRI(invoiceId, {
      xmlFirmado,
      estado: "ENVIADO",
    });

    // ── Step 4: Send to SRI (Reception) ──────────────────────────────────
    const receptionResult = await sriService.sendToSRI(
      xmlFirmado,
      invoice.company.ambiente,
      claveAcceso,
      invoiceId
    );

    if (receptionResult.estado !== "RECIBIDA") {
      // Mark as DEVUELTA so it can be queried and retried later
      await invoiceRepository.updateSRI(invoiceId, { estado: "DEVUELTA" });
      return {
        success: false,
        estado: "DEVUELTA",
        mensaje: receptionResult.mensaje,
        claveAcceso,
      };
    }

    // ── Step 5: Authorize ──────────────────────────────────────────────────
    const authResult = await sriService.authorizeInvoice(
      claveAcceso,
      invoice.company.ambiente,
      invoiceId
    );

    return {
      success: authResult.estado === "AUTORIZADA",
      estado: authResult.estado,
      numeroAutorizacion: authResult.numeroAutorizacion,
      fechaAutorizacion: authResult.fechaAutorizacion,
      claveAcceso,
      xmlAutorizado: authResult.xmlAutorizado,
    };
  },

  async sendToSRI(
    xmlFirmado: string,
    ambiente: "PRUEBAS" | "PRODUCCION",
    claveAcceso: string,
    invoiceId: string
  ): Promise<{ estado: string; mensaje?: string }> {
    if (USE_MOCK) {
      return mockReception(claveAcceso, invoiceId);
    }

    try {
      const xmlBase64 = Buffer.from(xmlFirmado).toString("base64");
      const soapEnvelope = buildReceptionSOAP(xmlBase64);

      const url = getSRIEndpoints()[ambiente].recepcion;
      const response = await axios.post(url, soapEnvelope, {
        headers: { "Content-Type": "text/xml; charset=UTF-8" },
        timeout: 30000,
        httpsAgent,
      });

      const parsed = parseReceptionResponse(response.data);

      await invoiceRepository.addSRIResponse(invoiceId, {
        tipo: "RECEPCION",
        estado: parsed.estado,
        rawResponse: response.data,
      });

      return parsed;
    } catch (err) {
      let message = err instanceof Error ? err.message : "Error de conexión con SRI";
      let rawResponse: string | undefined;
      if (axios.isAxiosError(err) && err.response?.data) {
        rawResponse = String(err.response.data);
        // Try to extract SOAP fault detail from the response
        const faultMatch = rawResponse.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
        if (faultMatch) message = `SOAP Fault: ${faultMatch[1]}`;
        else message = `HTTP ${err.response.status}: ${rawResponse.slice(0, 300)}`;
      }
      await invoiceRepository.addSRIResponse(invoiceId, {
        tipo: "RECEPCION",
        estado: "ERROR",
        mensaje: message,
        rawResponse,
      });
      throw new Error(`Error enviando al SRI: ${message}`);
    }
  },

  async authorizeInvoice(
    claveAcceso: string,
    ambiente: "PRUEBAS" | "PRODUCCION",
    invoiceId: string
  ): Promise<{
    estado: string;
    numeroAutorizacion?: string;
    fechaAutorizacion?: Date;
    xmlAutorizado?: string;
  }> {
    if (USE_MOCK) {
      return mockAuthorization(claveAcceso, invoiceId);
    }

    try {
      const soapEnvelope = buildAuthorizationSOAP(claveAcceso);
      const url = getSRIEndpoints()[ambiente].autorizacion;

      const response = await axios.post(url, soapEnvelope, {
        headers: { "Content-Type": "text/xml; charset=UTF-8" },
        timeout: 30000,
        httpsAgent,
      });

      const parsed = parseAuthorizationResponse(response.data);

      await invoiceRepository.addSRIResponse(invoiceId, {
        tipo: "AUTORIZACION",
        estado: parsed.estado,
        rawResponse: response.data,
      });

      if (parsed.estado === "AUTORIZADA" && parsed.numeroAutorizacion) {
        await invoiceRepository.updateSRI(invoiceId, {
          estado: "AUTORIZADO",
          numeroAutorizacion: parsed.numeroAutorizacion,
          fechaAutorizacion: parsed.fechaAutorizacion,
          xmlAutorizado: parsed.xmlAutorizado,
        });
      } else {
        await invoiceRepository.updateSRI(invoiceId, { estado: "RECHAZADO" });
      }

      return parsed;
    } catch (err) {
      let message = err instanceof Error ? err.message : "Error de autorización";
      let rawResponse: string | undefined;
      if (axios.isAxiosError(err) && err.response?.data) {
        rawResponse = String(err.response.data);
        const faultMatch = rawResponse.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
        if (faultMatch) message = `SOAP Fault: ${faultMatch[1]}`;
        else message = `HTTP ${err.response.status}: ${rawResponse.slice(0, 300)}`;
      }
      await invoiceRepository.addSRIResponse(invoiceId, {
        tipo: "AUTORIZACION",
        estado: "ERROR",
        mensaje: message,
        rawResponse,
      });
      throw new Error(`Error autorizando comprobante: ${message}`);
    }
  },
};

// ─── SOAP Builders ────────────────────────────────────────────────────────────

function buildReceptionSOAP(xmlBase64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildAuthorizationSOAP(claveAcceso: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── Response Parsers ─────────────────────────────────────────────────────────

function parseReceptionResponse(xml: string): { estado: string; mensaje?: string; informacion?: string } {
  const stateMatch = xml.match(/<estado>([^<]+)<\/estado>/);
  // Collect all error messages (identificador + mensaje + informacionAdicional)
  const errores: string[] = [];
  const msgRegex = /<mensaje[^>]*>([\s\S]*?)<\/mensaje>/g;
  let m;
  while ((m = msgRegex.exec(xml)) !== null) {
    const block = m[1];
    const id = block.match(/<identificador>([^<]+)<\/identificador>/)?.[1];
    const msg = block.match(/<mensaje>([^<]+)<\/mensaje>/)?.[1];
    const info = block.match(/<informacionAdicional>([^<]+)<\/informacionAdicional>/)?.[1];
    const tipo = block.match(/<tipo>([^<]+)<\/tipo>/)?.[1];
    if (msg) errores.push(`[${id ?? "?"}][${tipo ?? "?"}] ${msg}${info ? ` (${info})` : ""}`);
  }
  // Fallback: simple mensaje tag
  const simpleMsgMatch = errores.length === 0 ? xml.match(/<mensaje>([^<]+)<\/mensaje>/) : null;
  return {
    estado: stateMatch?.[1] ?? "ERROR",
    mensaje: errores.length > 0 ? errores.join(" | ") : simpleMsgMatch?.[1],
  };
}

function parseAuthorizationResponse(xml: string): {
  estado: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: Date;
  xmlAutorizado?: string;
} {
  const stateMatch = xml.match(/<estado>([^<]+)<\/estado>/);
  const numMatch = xml.match(/<numeroAutorizacion>([^<]+)<\/numeroAutorizacion>/);
  const fechaMatch = xml.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/);
  const comprobanteMatch = xml.match(/<comprobante><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/);

  return {
    estado: stateMatch?.[1] ?? "NO_AUTORIZADA",
    numeroAutorizacion: numMatch?.[1],
    fechaAutorizacion: fechaMatch?.[1] ? new Date(fechaMatch[1]) : undefined,
    xmlAutorizado: comprobanteMatch?.[1],
  };
}

// ─── Mock Implementations ─────────────────────────────────────────────────────

async function mockReception(
  claveAcceso: string,
  invoiceId: string
): Promise<{ estado: string; mensaje?: string }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 500));

  await invoiceRepository.addSRIResponse(invoiceId, {
    tipo: "RECEPCION",
    estado: "RECIBIDA",
    mensaje: "RECIBIDA (simulado)",
    rawResponse: `<estado>RECIBIDA</estado><claveAcceso>${claveAcceso}</claveAcceso>`,
  });

  return { estado: "RECIBIDA" };
}

async function mockAuthorization(
  claveAcceso: string,
  invoiceId: string
): Promise<{
  estado: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: Date;
  xmlAutorizado?: string;
}> {
  await new Promise((r) => setTimeout(r, 800));

  const numeroAutorizacion = claveAcceso; // SRI uses the clave as numero autorizacion
  const fechaAutorizacion = new Date();

  await invoiceRepository.addSRIResponse(invoiceId, {
    tipo: "AUTORIZACION",
    estado: "AUTORIZADA",
    mensaje: "AUTORIZADA (simulado)",
  });

  await invoiceRepository.updateSRI(invoiceId, {
    estado: "AUTORIZADO",
    numeroAutorizacion,
    fechaAutorizacion,
  });

  return {
    estado: "AUTORIZADA",
    numeroAutorizacion,
    fechaAutorizacion,
  };
}
