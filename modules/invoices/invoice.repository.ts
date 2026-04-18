import { prisma } from "@/lib/prisma";
import type { CreateInvoiceDTO, CreateInvoiceDetailDTO } from "@/types";
import { IVA_RATES } from "@/types";
import type { Prisma } from "@prisma/client";

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
        include: {
          client: true,
          details: true,
        },
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
        details: { include: { product: true }, orderBy: { orden: "asc" } },
        sriResponses: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async getNextSecuencial(companyId: string): Promise<string> {
    const [last, company] = await Promise.all([
      prisma.invoice.findFirst({
        where: { companyId },
        orderBy: { secuencial: "desc" },
        select: { secuencial: true },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { secuencialInicio: true },
      }),
    ]);

    const inicio = company?.secuencialInicio ?? 1;
    const lastNum = last ? parseInt(last.secuencial, 10) : 0;
    // secuencialInicio actúa como piso mínimo:
    // si ya hay facturas, continúa desde el último pero nunca por debajo de secuencialInicio.
    const next = Math.max(lastNum + 1, inicio);
    return next.toString().padStart(9, "0");
  },

  async create(
    companyId: string,
    clientId: string,
    ambiente: "PRUEBAS" | "PRODUCCION",
    dto: CreateInvoiceDTO,
    branchId?: string
  ) {
    const secuencial = await invoiceRepository.getNextSecuencial(companyId);

    // Calculate totals
    let subtotal0 = 0,
      subtotal12 = 0,
      subtotal5 = 0,
      subtotal15 = 0,
      subtotalNoIva = 0,
      totalDescuento = 0,
      totalIva = 0;

    const detailsData = dto.details.map((d, i) => {
      const { precioTotalSinImpuesto, valorIva } = calcDetailTotals(d);
      totalDescuento += d.descuento ?? 0;
      totalIva += valorIva;

      if (d.tipoIva === "IVA_0") subtotal0 += precioTotalSinImpuesto;
      else if (d.tipoIva === "IVA_STANDARD") subtotal15 += precioTotalSinImpuesto;
      else if (d.tipoIva === "IVA_5") subtotal5 += precioTotalSinImpuesto;
      else subtotalNoIva += precioTotalSinImpuesto;

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

    const importeTotal =
      Math.round(
        (subtotal0 + subtotal5 + subtotal15 + subtotalNoIva + totalIva) *
          100
      ) / 100;

    return prisma.invoice.create({
      data: {
        companyId,
        clientId,
        secuencial,
        ambiente,
        branchId: branchId ?? null,
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : new Date(),
        observaciones: dto.observaciones,
        formaPago: dto.formaPago ?? "01",
        montoPagado: dto.montoPagado,
        vuelto: dto.vuelto,
        subtotal0,
        subtotal12,
        subtotal5,
        subtotal15,
        subtotalNoIva,
        totalDescuento,
        totalIva,
        importeTotal,
        details: { create: detailsData },
      },
      include: {
        company: true,
        client: true,
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
    // Uses update (not updateMany) since invoice id is globally unique (cuid).
    // The companyId check is enforced at service layer via findById before calling this.
    return prisma.invoice.update({ where: { id }, data: data as never });
  },

  /** Returns invoices that need to be sent or re-sent to the SRI */
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
