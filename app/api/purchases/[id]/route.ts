export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { purchaseService } from "@/modules/purchases/purchase.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  const purchase = await purchaseService.getById(id, auth.payload.companyId);
  if (!purchase) return apiError("Compra no encontrada", 404);
  return apiSuccess(purchase);
}
