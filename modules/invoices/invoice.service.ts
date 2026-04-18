import { invoiceRepository } from "./invoice.repository";
import { companyRepository } from "@/modules/company/company.repository";
import { clientRepository } from "@/modules/clients/client.repository";
import type { CreateInvoiceDTO, CreateInvoiceDetailDTO } from "@/types";
import { IVA_RATES } from "@/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcImporteTotal(details: CreateInvoiceDetailDTO[]): number {
  let total = 0;
  for (const d of details) {
    const subtotal = round2(d.cantidad * d.precioUnitario - (d.descuento ?? 0));
    const iva = round2((subtotal * (IVA_RATES[d.tipoIva] ?? 0)) / 100);
    total += subtotal + iva;
  }
  return round2(total);
}

export const invoiceService = {
  async getAll(
    companyId: string,
    opts?: { estado?: string; search?: string; page?: number; limit?: number }
  ) {
    return invoiceRepository.findAll(companyId, opts);
  },

  async getById(id: string, companyId: string) {
    const invoice = await invoiceRepository.findById(id, companyId);
    if (!invoice) throw new Error("Factura no encontrada");
    return invoice;
  },

  async create(companyId: string, dto: CreateInvoiceDTO, branchId?: string) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw new Error("Empresa no encontrada");

    const client = await clientRepository.findById(dto.clientId, companyId);
    if (!client) throw new Error("Cliente no encontrado");

    if (!dto.details || dto.details.length === 0) {
      throw new Error("La factura debe tener al menos un detalle");
    }

    // Validar pago si se proporcionó montoPagado
    if (dto.montoPagado !== undefined) {
      const importeTotal = calcImporteTotal(dto.details);
      const mp = round2(dto.montoPagado);
      if (mp < importeTotal) {
        throw new Error(
          `Monto insuficiente: se requieren $${importeTotal.toFixed(2)}, se pagaron $${mp.toFixed(2)}`
        );
      }
      dto.vuelto = round2(mp - importeTotal);
    }

    return invoiceRepository.create(
      companyId,
      dto.clientId,
      company.ambiente,
      dto,
      branchId
    );
  },

  async anular(id: string, companyId: string, motivo?: string) {
    const invoice = await invoiceRepository.findById(id, companyId);
    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.estado === "ANULADO") throw new Error("La factura ya está anulada");
    return invoiceRepository.anular(id, motivo);
  },

  async getStats(companyId: string) {
    const [total, pendientes, autorizadas, rechazadas] = await Promise.all([
      invoiceRepository.findAll(companyId, { limit: 1 }),
      invoiceRepository.findAll(companyId, { estado: "PENDIENTE", limit: 1 }),
      invoiceRepository.findAll(companyId, { estado: "AUTORIZADO", limit: 1 }),
      invoiceRepository.findAll(companyId, { estado: "RECHAZADO", limit: 1 }),
    ]);

    return {
      total: total.total,
      pendientes: pendientes.total,
      autorizadas: autorizadas.total,
      rechazadas: rechazadas.total,
    };
  },
};
