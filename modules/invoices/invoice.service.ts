import { invoiceRepository } from "./invoice.repository";
import { companyRepository } from "@/modules/company/company.repository";
import { clientRepository } from "@/modules/clients/client.repository";
import type { CreateInvoiceDTO } from "@/types";

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

  async create(companyId: string, dto: CreateInvoiceDTO) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw new Error("Empresa no encontrada");

    const client = await clientRepository.findById(dto.clientId, companyId);
    if (!client) throw new Error("Cliente no encontrado");

    if (!dto.details || dto.details.length === 0) {
      throw new Error("La factura debe tener al menos un detalle");
    }

    return invoiceRepository.create(
      companyId,
      dto.clientId,
      company.ambiente,
      dto
    );
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
