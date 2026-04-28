import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function calcVencimiento(
  fechaEmision: Date,
  plazo?: number | null,
  unidadTiempo?: string | null
): Date {
  const fecha = new Date(fechaEmision);
  const n = plazo ?? 30;
  if (unidadTiempo === "meses") {
    fecha.setMonth(fecha.getMonth() + n);
  } else if (unidadTiempo === "anios") {
    fecha.setFullYear(fecha.getFullYear() + n);
  } else {
    fecha.setDate(fecha.getDate() + n);
  }
  return fecha;
}

/**
 * Genera el plan de cuotas mensuales para un crédito a N meses.
 * Cuota i vence en fechaEmision + i meses (i = 1..plazo).
 * El monto se distribuye uniformemente; la última cuota absorbe el centavo de redondeo.
 */
function buildCuotas(
  cxcId: string,
  fechaEmision: Date,
  total: number,
  plazo: number
): Prisma.CuotaCxCCreateManyInput[] {
  const montoPorCuota = Math.floor((total / plazo) * 100) / 100;
  const ultimaMonto = Math.round((total - montoPorCuota * (plazo - 1)) * 100) / 100;

  return Array.from({ length: plazo }, (_, i) => {
    const fechaVenc = new Date(fechaEmision);
    fechaVenc.setMonth(fechaVenc.getMonth() + (i + 1));
    return {
      cxcId,
      numeroCuota: i + 1,
      monto: i === plazo - 1 ? ultimaMonto : montoPorCuota,
      fechaVencimiento: fechaVenc,
      estado: "PENDIENTE" as const,
    };
  });
}

/**
 * Actualiza estados de cuotas tras un abono.
 * Regla: marca PAGADO las primeras N cuotas cuya suma acumulada ≤ totalCobrado.
 * Las restantes quedan PENDIENTE o VENCIDO si ya pasó su fecha.
 */
async function actualizarCuotas(
  tx: Prisma.TransactionClient,
  cxcId: string,
  totalCobrado: number
) {
  const cuotas = await tx.cuotaCxC.findMany({
    where: { cxcId },
    orderBy: { numeroCuota: "asc" },
  });
  if (cuotas.length === 0) return;

  const now = new Date();
  let acumulado = 0;

  for (const cuota of cuotas) {
    acumulado = Math.round((acumulado + Number(cuota.monto)) * 100) / 100;

    let nuevoEstado: "PENDIENTE" | "PAGADO" | "VENCIDO";
    if (totalCobrado >= acumulado - 0.01) {
      nuevoEstado = "PAGADO";
    } else if (cuota.fechaVencimiento < now) {
      nuevoEstado = "VENCIDO";
    } else {
      nuevoEstado = "PENDIENTE";
    }

    if (nuevoEstado !== cuota.estado) {
      await tx.cuotaCxC.update({
        where: { id: cuota.id },
        data: { estado: nuevoEstado as never },
      });
    }
  }
}

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
          cuotas: { orderBy: { numeroCuota: "asc" } },
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
        cuotas: { orderBy: { numeroCuota: "asc" } },
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

    const cxc = await tx.cuentaPorCobrar.create({
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

    // Generar plan de cuotas para créditos en meses (plazo >= 1)
    if (
      data.unidadTiempo === "meses" &&
      data.plazo &&
      data.plazo >= 1
    ) {
      const cuotas = buildCuotas(
        cxc.id,
        data.fechaEmision,
        data.totalOriginal,
        data.plazo
      );
      await tx.cuotaCxC.createMany({ data: cuotas });
    }

    return cxc;
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

      const updated = await tx.cuentaPorCobrar.update({
        where: { id: cxcId },
        data: { saldoPendiente: nuevoSaldo, estado: nuevoEstado as never },
        include: {
          client: true,
          invoice: { select: { id: true, secuencial: true } },
          abonos: { orderBy: { fecha: "asc" } },
          cuotas: { orderBy: { numeroCuota: "asc" } },
        },
      });

      // Actualizar estados de cuotas según lo cobrado hasta ahora
      const totalCobrado = Math.round(
        (Number(cxc.totalOriginal) - nuevoSaldo) * 100
      ) / 100;
      await actualizarCuotas(tx, cxcId, totalCobrado);

      return updated;
    });
  },

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
        orderBy: { estado: "asc" },
        _count: { _all: true },
        _sum: { saldoPendiente: true },
      }),
    ]);

    const map: Record<string, { count: number; saldo: number }> = {};
    for (const s of byEstado) {
      // Prisma v7 groupBy types bleed input shape into result — cast needed
      const cnt = s._count as { _all?: number } | undefined;
      map[s.estado] = {
        count: cnt?._all ?? 0,
        saldo: Number(s._sum?.saldoPendiente ?? 0),
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
