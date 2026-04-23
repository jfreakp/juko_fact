export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { inventoryService } from "@/modules/inventory/inventory.service";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;

  try {
    const alerts = await inventoryService.getAlerts(auth.payload.companyId, branchId);
    return apiSuccess(alerts);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al obtener alertas");
  }
}
