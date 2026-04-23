export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  try {
    const invoice = await invoiceService.getById(id, auth.payload.companyId);
    return apiSuccess(invoice);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error", 404);
  }
}
