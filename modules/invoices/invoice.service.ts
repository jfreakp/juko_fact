import { invoiceRepository } from "./invoice.repository";
import { companyRepository } from "@/modules/company/company.repository";
import { clientRepository } from "@/modules/clients/client.repository";
import { validateStock, deductFromInvoice, revertFromInvoice } from "@/modules/inventory/stock.service";
import { prisma } from "@/lib/prisma";
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

  async create(companyId: string, dto: CreateInvoiceDTO, branchId?: string, userId?: string) {
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

    // Validar stock disponible antes de crear (fuera de tx para mejor mensaje de error)
    if (branchId) {
      const stockItems = dto.details
        .filter((d) => d.productId)
        .map((d) => ({ productId: d.productId!, cantidad: d.cantidad }));

      if (stockItems.length > 0) {
        const check = await validateStock(companyId, branchId, stockItems);
        if (!check.ok) {
          throw new Error(`Stock insuficiente:\n${check.errors.join("\n")}`);
        }
      }
    }

    // Sin integración de stock (sin branchId o sin userId): flujo original
    if (!branchId || !userId) {
      return invoiceRepository.create(companyId, dto.clientId, company.ambiente, dto, branchId);
    }

    // Con stock: todo en una transacción
    return prisma.$transaction(async (tx) => {
      const invoice = await invoiceRepository.createWithTx(
        tx, companyId, dto.clientId, company.ambiente, dto, branchId
      );

      for (const detail of dto.details) {
        if (!detail.productId) continue;
        await deductFromInvoice({
          companyId,
          branchId,
          productId: detail.productId,
          cantidad: detail.cantidad,
          referencia: invoice.secuencial,
          referenciaId: invoice.id,
          userId,
          tx,
        });
      }

      return invoice;
    });
  },

  async anular(id: string, companyId: string, motivo?: string, userId?: string) {
    const invoice = await invoiceRepository.findById(id, companyId);
    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.estado === "ANULADO") throw new Error("La factura ya está anulada");

    // Sin integración de stock
    if (!invoice.branchId || !userId) {
      return invoiceRepository.anular(id, motivo);
    }

    // Con stock: revertir movimientos en la misma transacción
    return prisma.$transaction(async (tx) => {
      const anulada = await invoiceRepository.anularWithTx(tx, id, motivo);

      for (const detail of invoice.details) {
        if (!detail.productId) continue;
        await revertFromInvoice({
          companyId,
          branchId: invoice.branchId!,
          productId: detail.productId,
          cantidad: Number(detail.cantidad),
          costoUnitario: Number(detail.precioUnitario),
          referencia: invoice.secuencial,
          referenciaId: invoice.id,
          userId,
          tx,
        });
      }

      return anulada;
    });
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
