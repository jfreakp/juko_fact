export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { todayEcuadorString, parseEcuadorDate } from "@/lib/ecuador-date";
import type { EstadoComprobante } from "@prisma/client";

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  return Number(v) || 0;
}

function monthStartEcuador(): Date {
  const today = todayEcuadorString(); // "YYYY-MM-DD"
  const [year, month] = today.split("-");
  return parseEcuadorDate(`${year}-${month}-01`);
}

function todayStartEcuador(): Date {
  return parseEcuadorDate(todayEcuadorString());
}

function tomorrowStartEcuador(): Date {
  const d = todayStartEcuador();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

const EXCLUDED: EstadoComprobante[] = ["ANULADO", "RECHAZADO"];

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { companyId } = auth.payload;

  const todayStart = todayStartEcuador();
  const todayEnd   = tomorrowStartEcuador();
  const monthStart = monthStartEcuador();

  const [
    invoiceStats,
    ventasHoy,
    ventasMes,
    comprasMes,
    stockAlerts,
    recentInvoices,
    topProductos,
  ] = await Promise.all([
    // 1. Conteos por estado (todos los tiempos)
    prisma.invoice.groupBy({
      by: ["estado"],
      where: { companyId },
      _count: { id: true },
    }),

    // 2. Ventas de hoy (importe total y count)
    prisma.invoice.aggregate({
      where: {
        companyId,
        estado: { notIn: EXCLUDED },
        fechaEmision: { gte: todayStart, lt: todayEnd },
      },
      _sum: { importeTotal: true },
      _count: { _all: true },
    }),

    // 3. Ventas del mes (importe + IVA)
    prisma.invoice.aggregate({
      where: {
        companyId,
        estado: { notIn: EXCLUDED },
        fechaEmision: { gte: monthStart, lt: todayEnd },
      },
      _sum: { importeTotal: true, totalIva: true },
      _count: { _all: true },
    }),

    // 4. Compras del mes
    prisma.purchase.aggregate({
      where: {
        companyId,
        fechaCompra: { gte: monthStart, lt: todayEnd },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),

    // 5. Productos con stock en alerta (cantidad <= stockMinimo)
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM stock s
      JOIN inventory_products ip ON ip.id = s."inventoryProductId"
      WHERE s."companyId" = ${companyId}
        AND ip."tracksInventory" = true
        AND s.cantidad <= s."stockMinimo"
    `,

    // 6. Últimas 5 facturas
    prisma.invoice.findMany({
      where: { companyId },
      include: { client: { select: { razonSocial: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // 7. Top 5 productos del mes
    prisma.invoiceDetail.groupBy({
      by: ["descripcion", "codigoPrincipal"],
      where: {
        invoice: {
          companyId,
          estado: { notIn: EXCLUDED },
          fechaEmision: { gte: monthStart, lt: todayEnd },
        },
      },
      _sum: { precioTotalSinImpuesto: true, cantidad: true },
      orderBy: { _sum: { precioTotalSinImpuesto: "desc" } },
      take: 5,
    }),
  ]);

  // Build estado map
  const estadoMap: Record<string, number> = {};
  let totalFacturas = 0;
  for (const g of invoiceStats) {
    estadoMap[g.estado] = g._count.id;
    totalFacturas += g._count.id;
  }

  return apiSuccess({
    // Totales históricos
    totalFacturas,
    pendientes:  estadoMap["PENDIENTE"]  ?? 0,
    autorizadas: estadoMap["AUTORIZADO"] ?? 0,
    rechazadas:  estadoMap["RECHAZADO"]  ?? 0,
    anuladas:    estadoMap["ANULADO"]    ?? 0,
    devueltas:   estadoMap["DEVUELTA"]   ?? 0,

    // KPIs del día
    ventasHoy:       toNum(ventasHoy._sum?.importeTotal),
    facturasHoy:     ventasHoy._count._all,

    // KPIs del mes
    ventasMes:       toNum(ventasMes._sum?.importeTotal),
    ivaMes:          toNum(ventasMes._sum?.totalIva),
    facturasMes:     ventasMes._count._all,

    // Compras del mes
    comprasMes:      toNum(comprasMes._sum?.total),
    nComprasMes:     comprasMes._count._all,

    // Inventario
    alertasStock:    toNum(stockAlerts[0]?.count ?? 0),

    // Tablas
    recentInvoices: recentInvoices.map((inv) => ({
      id:           inv.id,
      secuencial:   inv.secuencial,
      razonSocial:  inv.client.razonSocial,
      importeTotal: toNum(inv.importeTotal),
      estado:       inv.estado,
      fechaEmision: inv.fechaEmision,
    })),
    topProductos: topProductos.map((p) => ({
      codigo:      p.codigoPrincipal,
      descripcion: p.descripcion,
      cantidad:    toNum(p._sum?.cantidad),
      subtotal:    toNum(p._sum?.precioTotalSinImpuesto),
    })),
  });
}
