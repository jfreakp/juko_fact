export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { cxcService } from "@/modules/cxc/cxc.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    const cxc = await cxcService.getById(id, auth.payload.companyId);
    return apiSuccess(cxc);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al obtener cuenta", 404);
  }
}
