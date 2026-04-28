import { invoiceRepository } from "./invoice.repository";
import { companyRepository } from "@/modules/company/company.repository";
import { clientRepository } from "@/modules/clients/client.repository";
import { validateStock, deductFromInvoice, revertFromInvoice } from "@/modules/inventory/stock.service";
import { cxcRepository } from "@/modules/cxc/cxc.repository";
import { prisma } from "@/lib/prisma";
import type { CreateInvoiceDTO, CreateInvoiceDetailDTO } from "@/types";
import { IVA_RATES } from "@/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcImporteTotal(details: CreateInvoiceDetailDTO[]): number {
  let totalCents = 0;
  for (const d of details) {
    const subtotal = round2(d.cantidad * d.precioUnitario - (d.descuento ?? 0));
    const iva = round2((subtotal * (IVA_RATES[d.tipoIva] ?? 0)) / 100);
    totalCents += Math.round((subtotal + iva) * 100);
  }
  return totalCents / 100;
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

    // E-02: Validar que ningún descuento exceda el subtotal de esa línea
    for (const d of dto.details) {
      const subtotal = d.cantidad * d.precioUnitario;
      if ((d.descuento ?? 0) > subtotal) {
        throw new Error(
          `Descuento ($${d.descuento}) no puede exceder el subtotal de línea ($${round2(subtotal)}) en "${d.descripcion}"`
        );
      }
    }

    // E-03: Validar que la fecha de emisión no sea futura
    if (dto.fechaEmision) {
      const emision = new Date(dto.fechaEmision);
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(0, 0, 0, 0);
      if (emision >= mañana) {
        throw new Error("La fecha de emisión no puede ser una fecha futura");
      }
    }

    // Validar pagos: deben existir y sumar exactamente el importe total
    if (!dto.pagos || dto.pagos.length === 0) {
      throw new Error("Debe registrar al menos una forma de pago");
    }
    const formasPago = dto.pagos.map((p) => p.formaPago);
    const duplicados = formasPago.filter((f, i) => formasPago.indexOf(f) !== i);
    if (duplicados.length > 0) {
      throw new Error("No puede haber más de un pago con la misma forma de pago");
    }
    const importeTotal = calcImporteTotal(dto.details);
    const sumaPagos = round2(dto.pagos.reduce((acc, p) => acc + p.monto, 0));
    if (Math.abs(sumaPagos - importeTotal) > 0.01) {
      throw new Error(
        `La suma de los pagos ($${sumaPagos.toFixed(2)}) no coincide con el total de la factura ($${importeTotal.toFixed(2)})`
      );
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

    // Detectar pago a crédito (formaPago=19) para crear CxC
    const pagoCredito = dto.pagos.find((p) => p.formaPago === "19");

    // Sin integración de stock (sin branchId o sin userId)
    if (!branchId || !userId) {
      // Sin crédito: flujo original sin transacción
      if (!pagoCredito) {
        return invoiceRepository.create(companyId, dto.clientId, company.ambiente, dto, branchId);
      }
      // Con crédito: necesitamos transacción para atomicidad
      return prisma.$transaction(async (tx) => {
        const invoice = await invoiceRepository.createWithTx(
          tx, companyId, dto.clientId, company.ambiente, dto, branchId
        );
        await cxcRepository.createWithTx(tx, {
          companyId,
          clientId: dto.clientId,
          invoiceId: invoice.id,
          totalOriginal: pagoCredito.monto,
          plazo: pagoCredito.plazo ?? null,
          unidadTiempo: pagoCredito.unidadTiempo ?? null,
          fechaEmision: invoice.fechaEmision,
        });
        return invoice;
      });
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

      if (pagoCredito) {
        await cxcRepository.createWithTx(tx, {
          companyId,
          clientId: dto.clientId,
          invoiceId: invoice.id,
          totalOriginal: pagoCredito.monto,
          plazo: pagoCredito.plazo ?? null,
          unidadTiempo: pagoCredito.unidadTiempo ?? null,
          fechaEmision: invoice.fechaEmision,
        });
      }

      return invoice;
    });
  },

  async anular(id: string, companyId: string, motivo?: string, userId?: string) {
    const invoice = await invoiceRepository.findById(id, companyId);
    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.estado === "ANULADO") throw new Error("La factura ya está anulada");

    // F-02: Un comprobante autorizado por el SRI no puede anularse localmente.
    // El contribuyente debe emitir una Nota de Crédito para reversar el efecto fiscal.
    if (invoice.estado === "AUTORIZADO") {
      throw new Error(
        "No se puede anular un comprobante ya autorizado por el SRI. " +
        "Emita una Nota de Crédito para reversar esta factura."
      );
    }

    // Sin integración de stock: anular en tx para poder cancelar CxC atómicamente
    if (!invoice.branchId || !userId) {
      return prisma.$transaction(async (tx) => {
        const anulada = await invoiceRepository.anularWithTx(tx, id, motivo);
        await cxcRepository.cancelarWithTx(tx, id);
        return anulada;
      });
    }

    // Con stock: revertir movimientos y cancelar CxC en la misma transacción
    return prisma.$transaction(async (tx) => {
      const anulada = await invoiceRepository.anularWithTx(tx, id, motivo);

      for (const detail of invoice.details) {
        if (!detail.productId) continue;
        await revertFromInvoice({
          companyId,
          branchId: invoice.branchId!,
          productId: detail.productId,
          cantidad: Number(detail.cantidad),
          referencia: invoice.secuencial,
          referenciaId: invoice.id,
          userId,
          tx,
        });
      }

      await cxcRepository.cancelarWithTx(tx, id);

      return anulada;
    });
  },

  // P-02: Delegado al repositorio con groupBy — 1 query en lugar de 4.
  async getStats(companyId: string) {
    return invoiceRepository.getStats(companyId);
  },
};
