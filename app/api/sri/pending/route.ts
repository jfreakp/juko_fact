import { NextRequest } from "next/server";
import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import { sriService } from "@/modules/sri/sri.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { z } from "zod";

/**
 * GET /api/sri/pending
 * Lists invoices that are PENDIENTE, DEVUELTA, or RECHAZADO
 * — documents that have not been successfully received by the SRI.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const invoices = await invoiceRepository.findPendingSRI(auth.payload.companyId);
    return apiSuccess(invoices);
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Error consultando documentos pendientes",
      500
    );
  }
}

const retrySchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1, "Debe especificar al menos una factura"),
});

/**
 * POST /api/sri/pending
 * Retries sending a list of PENDIENTE/DEVUELTA/RECHAZADO invoices to the SRI.
 * Per SRI spec: DEVUELTA and RECHAZADO reuse the same claveAcceso.
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = retrySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const results = [];
    for (const invoiceId of parsed.data.invoiceIds) {
      try {
        const result = await sriService.processInvoice(invoiceId, auth.payload.companyId);
        results.push({ invoiceId, ...result });
      } catch (err) {
        results.push({
          invoiceId,
          success: false,
          estado: "ERROR",
          mensaje: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    return apiSuccess(results);
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Error procesando reenvío",
      500
    );
  }
}
