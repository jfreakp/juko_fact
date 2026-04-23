export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const motivo: string | undefined =
    typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim() : undefined;

  try {
    await invoiceService.anular(id, auth.payload.companyId, motivo, auth.payload.userId);
    return apiSuccess({ message: "Factura anulada correctamente" });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al anular", 400);
  }
}
