import { create } from "xmlbuilder2";
import type { InvoiceForXML } from "@/types";
import { IVA_RATES, IVA_CODIGO_PORCENTAJE, TIPO_IDENTIFICACION_CODIGO } from "@/types";
import { formatEcuadorDate } from "@/lib/ecuador-date";

/**
 * Builds a factura XML following the SRI Ecuador v2.1.0 schema.
 * Returns the raw XML string (before signing).
 */
export function buildInvoiceXML(data: InvoiceForXML): string {
  const { invoice } = data;
  const { company, client, branch, details } = invoice;

  // F-04: Formatear fecha en hora local Ecuador (UTC-5), no en UTC.
  const fechaEmision = formatEcuadorDate(invoice.fechaEmision);
  const ambienteCode = invoice.ambiente === "PRODUCCION" ? "2" : "1";

  // F-07: El SRI exige identificacion = "9999999999999" para Consumidor Final.
  const identificacionComprador =
    client.tipoIdentif === "CONSUMIDOR_FINAL"
      ? "9999999999999"
      : client.identificacion;

  // F-05: Usar dirección de la sucursal emisora si existe; si no, la de la matriz.
  const dirEstablecimiento = branch?.direccion ?? company.dirMatriz;

  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("factura", { id: "comprobante", version: "2.1.0" });

  // ── infoTributaria ────────────────────────────────────────────────────────
  const infoTrib = root.ele("infoTributaria");
  infoTrib.ele("ambiente").txt(ambienteCode);
  infoTrib.ele("tipoEmision").txt(
    company.tipoEmision === "INDISPONIBILIDAD" ? "2" : "1"
  );
  infoTrib.ele("razonSocial").txt(company.razonSocial);
  if (company.nombreComercial) {
    infoTrib.ele("nombreComercial").txt(company.nombreComercial);
  }
  infoTrib.ele("ruc").txt(company.ruc);
  infoTrib.ele("claveAcceso").txt(invoice.claveAcceso ?? "");
  infoTrib.ele("codDoc").txt("01"); // 01 = Factura
  infoTrib.ele("estab").txt(company.estab);
  infoTrib.ele("ptoEmi").txt(company.ptoEmi);
  infoTrib.ele("secuencial").txt(invoice.secuencial);
  infoTrib.ele("dirMatriz").txt(company.dirMatriz);
  if (company.contribuyenteEsp) {
    infoTrib.ele("contribuyenteEspecial").txt(company.contribuyenteEsp);
  }

  // ── infoFactura ───────────────────────────────────────────────────────────
  const infoFact = root.ele("infoFactura");
  infoFact.ele("fechaEmision").txt(fechaEmision);

  // F-05: Dirección del establecimiento emisor, no siempre la matriz.
  infoFact.ele("dirEstablecimiento").txt(dirEstablecimiento);

  infoFact
    .ele("obligadoContabilidad")
    .txt(company.obligadoContab ? "SI" : "NO");

  infoFact
    .ele("tipoIdentificacionComprador")
    .txt(TIPO_IDENTIFICACION_CODIGO[client.tipoIdentif] ?? "05");
  infoFact.ele("razonSocialComprador").txt(client.razonSocial);

  // F-07: Identificación normalizada para Consumidor Final.
  infoFact.ele("identificacionComprador").txt(identificacionComprador);

  if (client.direccion) {
    infoFact.ele("direccionComprador").txt(client.direccion);
  }

  const subtotalSinImpuestos =
    Number(invoice.subtotal0) +
    Number(invoice.subtotal5) +
    Number(invoice.subtotal12) +
    Number(invoice.subtotal15) +
    Number(invoice.subtotalNoIva);

  infoFact.ele("totalSinImpuestos").txt(fmt(subtotalSinImpuestos));
  infoFact.ele("totalDescuento").txt(fmt(Number(invoice.totalDescuento)));

  // totalConImpuestos
  // Los valores de IVA se suman desde los detalles (ya calculados y redondeados
  // por línea) para evitar diferencias de redondeo al recalcular desde subtotales.
  const ivaByTipo: Record<string, number> = {};
  for (const d of details) {
    ivaByTipo[d.tipoIva] = (ivaByTipo[d.tipoIva] ?? 0) + Number(d.valorIva);
  }

  const totalConImpuestos = infoFact.ele("totalConImpuestos");

  if (Number(invoice.subtotal0) > 0) {
    addTotalImpuesto(totalConImpuestos, "2", "0", invoice.subtotal0, 0);
  }
  if (Number(invoice.subtotal5) > 0) {
    addTotalImpuesto(totalConImpuestos, "2", "5", invoice.subtotal5, ivaByTipo["IVA_5"] ?? 0);
  }
  if (Number(invoice.subtotal15) > 0) {
    addTotalImpuesto(
      totalConImpuestos, "2", IVA_CODIGO_PORCENTAJE["IVA_STANDARD"] ?? "4",
      invoice.subtotal15,
      ivaByTipo["IVA_STANDARD"] ?? 0
    );
  }
  // Items sin IVA (No Objeto de Impuesto — codigoPorcentaje 6)
  if (Number(invoice.subtotalNoIva) > 0) {
    addTotalImpuesto(totalConImpuestos, "2", "6", invoice.subtotalNoIva, 0);
  }

  infoFact.ele("propina").txt(fmt(Number(invoice.propina)));
  infoFact.ele("importeTotal").txt(fmt(Number(invoice.importeTotal)));
  infoFact.ele("moneda").txt("DOLAR");

  // ── pagos ─────────────────────────────────────────────────────────────────
  const pagosEl = infoFact.ele("pagos");
  const paymentList = (invoice as { payments?: { formaPago: string; monto: number | { toString(): string } }[] }).payments;
  if (paymentList && paymentList.length > 0) {
    for (const p of paymentList) {
      const pagoEl = pagosEl.ele("pago");
      pagoEl.ele("formaPago").txt(p.formaPago);
      pagoEl.ele("total").txt(fmt(Number(p.monto)));
    }
  } else {
    // Fallback: pago único por el total (compatibilidad con registros antiguos)
    const pagoEl = pagosEl.ele("pago");
    pagoEl.ele("formaPago").txt("01");
    pagoEl.ele("total").txt(fmt(Number(invoice.importeTotal)));
  }

  // ── detalles ──────────────────────────────────────────────────────────────
  const detallesEl = root.ele("detalles");

  for (const d of details) {
    const detalle = detallesEl.ele("detalle");
    detalle.ele("codigoPrincipal").txt(d.codigoPrincipal);
    if (d.codigoAuxiliar) {
      detalle.ele("codigoAuxiliar").txt(d.codigoAuxiliar);
    }
    detalle.ele("descripcion").txt(d.descripcion);
    detalle.ele("cantidad").txt(fmt6(Number(d.cantidad)));
    detalle.ele("precioUnitario").txt(fmt6(Number(d.precioUnitario)));
    detalle.ele("descuento").txt(fmt(Number(d.descuento)));
    detalle
      .ele("precioTotalSinImpuesto")
      .txt(fmt(Number(d.precioTotalSinImpuesto)));

    const impuestosEl = detalle.ele("impuestos");
    const impuesto = impuestosEl.ele("impuesto");
    impuesto.ele("codigo").txt("2"); // IVA
    impuesto
      .ele("codigoPorcentaje")
      .txt(IVA_CODIGO_PORCENTAJE[d.tipoIva] ?? "0");
    const rate = IVA_RATES[d.tipoIva] ?? 0;
    impuesto.ele("tarifa").txt(rate.toFixed(2));
    impuesto
      .ele("baseImponible")
      .txt(fmt(Number(d.precioTotalSinImpuesto)));
    impuesto.ele("valor").txt(fmt(Number(d.valorIva)));
  }

  // ── infoAdicional ─────────────────────────────────────────────────────────
  if (client.email || client.telefono || invoice.observaciones) {
    const infoAdicional = root.ele("infoAdicional");
    if (client.email) {
      infoAdicional
        .ele("campoAdicional", { nombre: "email" })
        .txt(client.email);
    }
    if (client.telefono) {
      infoAdicional
        .ele("campoAdicional", { nombre: "telefono" })
        .txt(client.telefono);
    }
    if (invoice.observaciones) {
      infoAdicional
        .ele("campoAdicional", { nombre: "observaciones" })
        .txt(invoice.observaciones);
    }
  }

  return root.end({ prettyPrint: true });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function addTotalImpuesto(
  parent: ReturnType<typeof create>,
  codigo: string,
  codigoPorcentaje: string,
  baseImponible: unknown,
  valor: number
) {
  const ti = (parent as ReturnType<ReturnType<typeof create>["ele"]>).ele(
    "totalImpuesto"
  );
  ti.ele("codigo").txt(codigo);
  ti.ele("codigoPorcentaje").txt(codigoPorcentaje);
  ti.ele("baseImponible").txt(fmt(Number(baseImponible)));
  ti.ele("valor").txt(fmt(valor));
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function fmt6(n: number): string {
  return n.toFixed(6);
}
