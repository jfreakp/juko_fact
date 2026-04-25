export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const stats = await invoiceService.getStats(auth.payload.companyId);
  return apiSuccess(stats);
}
