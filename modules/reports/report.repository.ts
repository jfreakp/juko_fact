import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesPeriodRow {
  period: Date;
  count: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface IvaSummary {
  facturas: number;
  // Bases imponibles
  base0: number;       // subtotal0 — tarifa 0%
  base5: number;       // subtotal5 — tarifa 5%
  base15: number;      // subtotal15 + subtotal12 — tarifa estándar (15%)
  baseNoIva: number;   // subtotalNoIva — no sujeto a IVA
  // Descuentos e IVA
  descuento: number;
  iva: number;
  // Total
  total: number;
}

export interface TopProductRow {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  subtotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXCLUDED = ["ANULADO", "RECHAZADO"];

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  return Number(v) || 0;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const reportRepository = {
  /**
   * Ventas agrupadas por día o mes.
   * Solo facturas no anuladas ni rechazadas.
   */
  async getSalesByPeriod(
    companyId: string,
    from: Date,
    to: Date,
    groupBy: "day" | "month"
  ): Promise<SalesPeriodRow[]> {
    const truncExpr =
      groupBy === "month"
        ? Prisma.sql`DATE_TRUNC('month', "fechaEmision")`
        : Prisma.sql`DATE_TRUNC('day',   "fechaEmision")`;

    // Use Prisma.join for the NOT IN list
    const excluded = Prisma.join(EXCLUDED.map((s) => Prisma.sql`${s}`));

    const rows = await prisma.$queryRaw<
      Array<{
        period: Date;
        count: bigint;
        subtotal: string;
        iva: string;
        total: string;
      }>
    >`
      SELECT
        ${truncExpr}                                                AS period,
        COUNT(*)::int                                              AS count,
        COALESCE(SUM("subtotal0" + "subtotal5" + "subtotal15" + "subtotal12"), 0) AS subtotal,
        COALESCE(SUM("totalIva"), 0)                               AS iva,
        COALESCE(SUM("importeTotal"), 0)                           AS total
      FROM invoices
      WHERE "companyId" = ${companyId}
        AND "estado" NOT IN (${excluded})
        AND "fechaEmision" >= ${from}
        AND "fechaEmision" <= ${to}
      GROUP BY ${truncExpr}
      ORDER BY ${truncExpr} ASC
    `;

    return rows.map((r) => ({
      period: r.period,
      count:   toNum(r.count),
      subtotal: toNum(r.subtotal),
      iva:      toNum(r.iva),
      total:    toNum(r.total),
    }));
  },

  /**
   * Resumen de IVA para el período — valores que van al Formulario 104.
   */
  async getIvaSummary(
    companyId: string,
    from: Date,
    to: Date
  ): Promise<IvaSummary> {
    const [agg, count] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          estado: { notIn: EXCLUDED as never[] },
          fechaEmision: { gte: from, lte: to },
        },
        _sum: {
          subtotal0:      true,
          subtotal5:      true,
          subtotal15:     true,
          subtotal12:     true,
          subtotalNoIva:  true,
          totalDescuento: true,
          totalIva:       true,
          importeTotal:   true,
        },
      }),
      prisma.invoice.count({
        where: {
          companyId,
          estado: { notIn: EXCLUDED as never[] },
          fechaEmision: { gte: from, lte: to },
        },
      }),
    ]);

    const s = agg._sum;
    return {
      facturas:  count,
      base0:     toNum(s.subtotal0),
      base5:     toNum(s.subtotal5),
      base15:    toNum(s.subtotal15) + toNum(s.subtotal12),
      baseNoIva: toNum(s.subtotalNoIva),
      descuento: toNum(s.totalDescuento),
      iva:       toNum(s.totalIva),
      total:     toNum(s.importeTotal),
    };
  },

  /**
   * Top N productos por monto vendido en el período.
   */
  async getTopProducts(
    companyId: string,
    from: Date,
    to: Date,
    limit = 10
  ): Promise<TopProductRow[]> {
    const rows = await prisma.invoiceDetail.groupBy({
      by: ["codigoPrincipal", "descripcion"],
      where: {
        invoice: {
          companyId,
          estado: { notIn: EXCLUDED as never[] },
          fechaEmision: { gte: from, lte: to },
        },
      },
      _sum: {
        cantidad:               true,
        precioTotalSinImpuesto: true,
      },
      orderBy: { _sum: { precioTotalSinImpuesto: "desc" } },
      take: limit,
    });

    return rows.map((r) => ({
      codigoPrincipal: r.codigoPrincipal,
      descripcion:     r.descripcion,
      cantidad:        toNum(r._sum.cantidad),
      subtotal:        toNum(r._sum.precioTotalSinImpuesto),
    }));
  },
};
