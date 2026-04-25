export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { sriService } from "@/modules/sri/sri.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const sendSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const result = await sriService.processInvoice(
      parsed.data.invoiceId,
      auth.payload.companyId
    );

    return apiSuccess(result);
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Error procesando factura",
      500
    );
  }
}
