import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcVencimiento(
  fechaEmision: Date,
  plazo?: number | null,
  unidadTiempo?: string | null
): Date {
  const fecha = new Date(fechaEmision);
  const n = plazo ?? 30;
  if (unidadTiempo === "meses") {
    fecha.setMonth(fecha.getMonth() + n);
  } else {
    fecha.setDate(fecha.getDate() + n);
  }
  return fecha;
}

export { calcVencimiento };

// ─── Repositorio ─────────────────────────────────────────────────────────────

export const cxcRepository = {
  async findAll(
    companyId: string,
    opts?: {
      estado?: string;
      clientId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CuentaPorCobrarWhereInput = {
      companyId,
      ...(opts?.estado ? { estado: opts.estado as never } : {}),
      ...(opts?.clientId ? { clientId: opts.clientId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.cuentaPorCobrar.findMany({
        where,
        include: {
          client: true,
          invoice: {
            select: { secuencial: true, fechaEmision: true, importeTotal: true },
          },
          abonos: { orderBy: { fecha: "desc" }, take: 1 },
        },
        orderBy: { fechaVencimiento: "asc" },
        skip,
        take: limit,
      }),
      prisma.cuentaPorCobrar.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async findById(id: string, companyId: string) {
    return prisma.cuentaPorCobrar.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        invoice: {
          select: {
            id: true,
            secuencial: true,
            fechaEmision: true,
            importeTotal: true,
            estado: true,
            claveAcceso: true,
          },
        },
        abonos: { orderBy: { fecha: "asc" } },
      },
    });
  },

  async createWithTx(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      clientId: string;
      invoiceId: string;
      totalOriginal: number;
      plazo?: number | null;
      unidadTiempo?: string | null;
      fechaEmision: Date;
    }
  ) {
    const fechaVencimiento = calcVencimiento(
      data.fechaEmision,
      data.plazo,
      data.unidadTiempo
    );

    return tx.cuentaPorCobrar.create({
      data: {
        companyId: data.companyId,
        clientId: data.clientId,
        invoiceId: data.invoiceId,
        totalOriginal: data.totalOriginal,
        saldoPendiente: data.totalOriginal,
        estado: "PENDIENTE",
        fechaVencimiento,
      },
    });
  },

  async registrarAbono(
    cxcId: string,
    companyId: string,
    abono: {
      monto: number;
      formaPago: string;
      notas?: string;
      userId?: string;
      fecha?: Date;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const cxc = await tx.cuentaPorCobrar.findFirst({
        where: { id: cxcId, companyId },
      });
      if (!cxc) throw new Error("Cuenta por cobrar no encontrada");
      if (cxc.estado === "CANCELADA")
        throw new Error("Esta cuenta ha sido cancelada");
      if (cxc.estado === "PAGADO")
        throw new Error("Esta cuenta ya está completamente pagada");

      const saldoActual = Number(cxc.saldoPendiente);
      if (abono.monto > saldoActual + 0.001) {
        throw new Error(
          `El abono ($${abono.monto.toFixed(2)}) excede el saldo pendiente ($${saldoActual.toFixed(2)})`
        );
      }

      const nuevoSaldo =
        Math.max(0, Math.round((saldoActual - abono.monto) * 100)) / 100;

      let nuevoEstado: "PENDIENTE" | "PARCIAL" | "PAGADO" | "VENCIDO";
      if (nuevoSaldo <= 0) {
        nuevoEstado = "PAGADO";
      } else if (cxc.fechaVencimiento < new Date()) {
        nuevoEstado = "VENCIDO";
      } else {
        nuevoEstado = "PARCIAL";
      }

      await tx.abonoCxC.create({
        data: {
          cxcId,
          monto: abono.monto,
          formaPago: abono.formaPago,
          notas: abono.notas ?? null,
          userId: abono.userId ?? null,
          fecha: abono.fecha ?? new Date(),
        },
      });

      return tx.cuentaPorCobrar.update({
        where: { id: cxcId },
        data: { saldoPendiente: nuevoSaldo, estado: nuevoEstado as never },
        include: {
          client: true,
          invoice: { select: { id: true, secuencial: true } },
          abonos: { orderBy: { fecha: "asc" } },
        },
      });
    });
  },

  // Cancela la CxC asociada a una factura anulada (si existe y no está pagada)
  async cancelarWithTx(tx: Prisma.TransactionClient, invoiceId: string) {
    const cxc = await tx.cuentaPorCobrar.findFirst({ where: { invoiceId } });
    if (!cxc) return;
    if (cxc.estado === "PAGADO") return;
    await tx.cuentaPorCobrar.update({
      where: { id: cxc.id },
      data: { estado: "CANCELADA" as never },
    });
  },

  async getStats(companyId: string) {
    const [cartera, byEstado] = await prisma.$transaction([
      prisma.cuentaPorCobrar.aggregate({
        where: {
          companyId,
          estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] as never[] },
        },
        _sum: { saldoPendiente: true },
      }),
      prisma.cuentaPorCobrar.groupBy({
        by: ["estado"],
        where: { companyId },
        _count: { id: true },
        _sum: { saldoPendiente: true },
      }),
    ]);

    const map: Record<string, { count: number; saldo: number }> = {};
    for (const s of byEstado) {
      map[s.estado] = {
        count: s._count.id,
        saldo: Number(s._sum.saldoPendiente ?? 0),
      };
    }

    return {
      totalCartera: Number(cartera._sum.saldoPendiente ?? 0),
      pendientes: map["PENDIENTE"] ?? { count: 0, saldo: 0 },
      parciales:  map["PARCIAL"]   ?? { count: 0, saldo: 0 },
      vencidas:   map["VENCIDO"]   ?? { count: 0, saldo: 0 },
      pagadas:    map["PAGADO"]    ?? { count: 0, saldo: 0 },
    };
  },
};
