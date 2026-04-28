export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { cxcService } from "@/modules/cxc/cxc.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const params = req.nextUrl.searchParams;
  const result = await cxcService.getAll(auth.payload.companyId, {
    estado:   params.get("estado")   ?? undefined,
    clientId: params.get("clientId") ?? undefined,
    page:     params.get("page")  ? parseInt(params.get("page")!)  : undefined,
    limit:    params.get("limit") ? parseInt(params.get("limit")!) : undefined,
  });

  return apiSuccess(result);
}
