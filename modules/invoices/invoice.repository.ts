import { prisma } from "@/lib/prisma";
import { companyRepository } from "@/modules/company/company.repository";
import { parseEcuadorDate, todayEcuadorString } from "@/lib/ecuador-date";
import type { CreateInvoiceDTO, CreateInvoiceDetailDTO } from "@/types";
import { IVA_RATES } from "@/types";
import type { Prisma } from "@prisma/client";

// ─── Helpers aritméticos ──────────────────────────────────────────────────────

/**
 * D-01: Acumula céntimos como enteros para evitar errores de punto flotante.
 * Ejemplo: 0.10 + 0.20 en JS = 0.30000000000000004.
 *          (10 + 20) / 100   = 0.30  ✓
 */
function toCents(n: number): number {
  return Math.round(n * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function calcDetailTotals(detail: CreateInvoiceDetailDTO) {
  const cantidad = detail.cantidad;
  const precioUnit = detail.precioUnitario;
  const descuento = detail.descuento ?? 0;
  const precioTotalSinImpuesto =
    Math.round((cantidad * precioUnit - descuento) * 100) / 100;
  const rate = IVA_RATES[detail.tipoIva] ?? 0;
  const valorIva =
    Math.round(((precioTotalSinImpuesto * rate) / 100) * 100) / 100;
  return { precioTotalSinImpuesto, valorIva };
}

// ─── Cálculo de totales de cabecera (céntimos para evitar float drift) ────────

interface InvoiceTotals {
  subtotal0: number;
  subtotal12: number;
  subtotal5: number;
  subtotal15: number;
  subtotalNoIva: number;
  totalDescuento: number;
  totalIva: number;
  importeTotal: number;
}

function calcTotals(
  details: CreateInvoiceDetailDTO[],
  detailsData: ReturnType<typeof buildDetailsData>
): InvoiceTotals {
  // Usar céntimos para evitar acumulación de error de punto flotante
  let subtotal0 = 0,
    subtotal5 = 0,
    subtotal15 = 0,
    subtotalNoIva = 0,
    totalDescuento = 0,
    totalIva = 0;

  details.forEach((d, i) => {
    const { precioTotalSinImpuesto, valorIva } = detailsData[i];
    totalDescuento += toCents(d.descuento ?? 0);
    totalIva += toCents(valorIva);

    if (d.tipoIva === "IVA_0") subtotal0 += toCents(precioTotalSinImpuesto);
    else if (d.tipoIva === "IVA_STANDARD") subtotal15 += toCents(precioTotalSinImpuesto);
    else if (d.tipoIva === "IVA_5") subtotal5 += toCents(precioTotalSinImpuesto);
    else subtotalNoIva += toCents(precioTotalSinImpuesto);
  });

  const importeTotal = subtotal0 + subtotal5 + subtotal15 + subtotalNoIva + totalIva;

  return {
    subtotal0:    fromCents(subtotal0),
    subtotal12:   0, // Tasa histórica 12% — no aplica desde 2024
    subtotal5:    fromCents(subtotal5),
    subtotal15:   fromCents(subtotal15),
    subtotalNoIva: fromCents(subtotalNoIva),
    totalDescuento: fromCents(totalDescuento),
    totalIva:     fromCents(totalIva),
    importeTotal: fromCents(importeTotal),
  };
}

// ─── Builder de líneas de detalle ─────────────────────────────────────────────

function buildDetailsData(dto: CreateInvoiceDTO) {
  return dto.details.map((d, i) => {
    const { precioTotalSinImpuesto, valorIva } = calcDetailTotals(d);
    return {
      productId: d.productId,
      codigoPrincipal: d.codigoPrincipal,
      codigoAuxiliar: d.codigoAuxiliar,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      descuento: d.descuento ?? 0,
      precioTotalSinImpuesto,
      tipoIva: d.tipoIva,
      valorIva,
      orden: i,
    };
  });
}

// ─── Repositorio ──────────────────────────────────────────────────────────────

export const invoiceRepository = {
  async findAll(
    companyId: string,
    opts?: {
      estado?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(opts?.estado ? { estado: opts.estado as never } : {}),
      ...(opts?.search
        ? {
            OR: [
              {
                client: {
                  razonSocial: { contains: opts.search, mode: "insensitive" },
                },
              },
              { secuencial: { contains: opts.search } },
              { claveAcceso: { contains: opts.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        // P-03: No incluir details en el listado — carga innecesaria de datos.
        // Los detalles solo se cargan en findById (vista de detalle).
        include: { client: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async findById(id: string, companyId: string) {
    return prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        company: true,
        client: true,
        branch: true,
        details: { include: { product: true }, orderBy: { orden: "asc" } },
        sriResponses: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  /**
   * P-02: Stats en una sola query con groupBy en lugar de 4 COUNT separados.
   */
  async getStats(companyId: string) {
    const counts = await prisma.invoice.groupBy({
      by: ["estado"],
      where: { companyId },
      _count: { id: true },
    });

    const map: Record<string, number> = {};
    let total = 0;
    for (const c of counts) {
      map[c.estado] = c._count.id;
      total += c._count.id;
    }

    return {
      total,
      pendientes: map["PENDIENTE"] ?? 0,
      autorizadas: map["AUTORIZADO"] ?? 0,
      rechazadas: map["RECHAZADO"] ?? 0,
      anuladas: map["ANULADO"] ?? 0,
    };
  },

  /**
   * F-03: Usa el contador atómico de company para evitar duplicados en concurrencia.
   * @deprecated Llama a companyRepository.getNextSecuencial directamente.
   */
  async getNextSecuencial(companyId: string): Promise<string> {
    return companyRepository.getNextSecuencial(companyId);
  },

  async create(
    companyId: string,
    clientId: string,
    ambiente: "PRUEBAS" | "PRODUCCION",
    dto: CreateInvoiceDTO,
    branchId?: string
  ) {
    // F-03: Obtiene el secuencial atómicamente (fuera de la tx para evitar deadlocks).
    const secuencial = await companyRepository.getNextSecuencial(companyId);

    const detailsData = buildDetailsData(dto);
    const totals = calcTotals(dto.details, detailsData);

    // F-04: Interpretar fecha del cliente como hora Ecuador.
    const fechaEmision = dto.fechaEmision
      ? parseEcuadorDate(dto.fechaEmision)
      : parseEcuadorDate(todayEcuadorString());

    return prisma.invoice.create({
      data: {
        companyId,
        clientId,
        secuencial,
        ambiente,
        branchId: branchId ?? null,
        fechaEmision,
        observaciones: dto.observaciones,
        formaPago: dto.formaPago ?? "01",
        montoPagado: dto.montoPagado,
        vuelto: dto.vuelto,
        ...totals,
        details: { create: detailsData },
      },
      include: {
        company: true,
        client: true,
        branch: true,
        details: { include: { product: true } },
      },
    });
  },

  async updateSRI(
    id: string,
    data: {
      estado?: string;
      claveAcceso?: string;
      xmlGenerado?: string;
      xmlFirmado?: string;
      xmlAutorizado?: string;
      numeroAutorizacion?: string;
      fechaAutorizacion?: Date;
    }
  ) {
    // S-05: id de factura es globalmente único (cuid). La verificación de companyId
    // se realiza en la capa de servicio antes de llamar este método.
    return prisma.invoice.update({ where: { id }, data: data as never });
  },

  async findPendingSRI(companyId: string) {
    return prisma.invoice.findMany({
      where: {
        companyId,
        estado: { in: ["PENDIENTE", "DEVUELTA", "RECHAZADO"] as never[] },
      },
      include: { client: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async anular(id: string, motivo?: string) {
    return prisma.invoice.update({
      where: { id },
      data: {
        estado: "ANULADO" as never,
        motivoAnulacion: motivo ?? null,
        fechaAnulacion: new Date(),
      },
    });
  },

  /**
   * Versión de create que acepta un cliente de transacción externo.
   * F-03: El secuencial se obtiene fuera de la tx (increment atómico no se revierte
   * si la tx falla — gaps en la secuencia son aceptables, duplicados no).
   */
  async createWithTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    clientId: string,
    ambiente: "PRUEBAS" | "PRODUCCION",
    dto: CreateInvoiceDTO,
    branchId?: string
  ) {
    // F-03: Usar el contador atómico (fuera de la tx intencionalmente).
    const secuencial = await companyRepository.getNextSecuencial(companyId);

    const detailsData = buildDetailsData(dto);
    const totals = calcTotals(dto.details, detailsData);

    // F-04: Interpretar fecha del cliente como hora Ecuador.
    const fechaEmision = dto.fechaEmision
      ? parseEcuadorDate(dto.fechaEmision)
      : parseEcuadorDate(todayEcuadorString());

    return tx.invoice.create({
      data: {
        companyId,
        clientId,
        secuencial,
        ambiente,
        branchId: branchId ?? null,
        fechaEmision,
        observaciones: dto.observaciones,
        formaPago: dto.formaPago ?? "01",
        montoPagado: dto.montoPagado,
        vuelto: dto.vuelto,
        ...totals,
        details: { create: detailsData },
      },
      include: {
        company: true,
        client: true,
        branch: true,
        details: { include: { product: true } },
      },
    });
  },

  async anularWithTx(tx: Prisma.TransactionClient, id: string, motivo?: string) {
    return tx.invoice.update({
      where: { id },
      data: {
        estado: "ANULADO" as never,
        motivoAnulacion: motivo ?? null,
        fechaAnulacion: new Date(),
      },
    });
  },

  async addSRIResponse(
    invoiceId: string,
    data: {
      tipo: string;
      estado: string;
      mensaje?: string;
      informacion?: string;
      rawResponse?: string;
    }
  ) {
    return prisma.sRIResponse.create({ data: { invoiceId, ...data } });
  },
};
