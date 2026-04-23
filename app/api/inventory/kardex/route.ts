export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { inventoryService } from "@/modules/inventory/inventory.service";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const p = req.nextUrl.searchParams;

  try {
    const result = await inventoryService.getKardex(auth.payload.companyId, {
      productId: p.get("productId") ?? undefined,
      branchId:  p.get("branchId")  ?? undefined,
      from:      p.get("from")  ? new Date(p.get("from")!)  : undefined,
      to:        p.get("to")    ? new Date(p.get("to")!)    : undefined,
      page:      p.get("page")  ? Number(p.get("page"))     : 1,
      limit:     p.get("limit") ? Number(p.get("limit"))    : 50,
    });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al obtener kardex");
  }
}
