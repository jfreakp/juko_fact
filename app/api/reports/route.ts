export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { reportRepository } from "@/modules/reports/report.repository";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

function parseDate(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { companyId } = auth.payload;
  const params = req.nextUrl.searchParams;
  const type = params.get("type");

  // Default range: current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = parseDate(params.get("from"), monthStart);
  const to   = endOfDay(parseDate(params.get("to"), now));

  if (from > to) return apiError("La fecha de inicio debe ser anterior a la fecha fin");

  try {
    if (type === "sales") {
      // Auto-select groupBy based on range width
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
      const groupBy = diffDays <= 31 ? "day" : "month";
      const rows = await reportRepository.getSalesByPeriod(companyId, from, to, groupBy);
      return apiSuccess({ rows, groupBy });
    }

    if (type === "iva") {
      const summary = await reportRepository.getIvaSummary(companyId, from, to);
      return apiSuccess(summary);
    }

    if (type === "top-products") {
      const limit = Math.min(parseInt(params.get("limit") ?? "10"), 50);
      const rows = await reportRepository.getTopProducts(companyId, from, to, limit);
      return apiSuccess(rows);
    }

    return apiError("type requerido: sales | iva | top-products", 400);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al generar reporte");
  }
}
