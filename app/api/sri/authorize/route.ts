export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { sriService } from "@/modules/sri/sri.service";
import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const authorizeSchema = z.object({
  invoiceId: z.string().min(1, "ID de factura requerido"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = authorizeSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const invoice = await invoiceRepository.findById(
      parsed.data.invoiceId,
      auth.payload.companyId
    );
    if (!invoice) return apiError("Factura no encontrada", 404);
    if (!invoice.claveAcceso) {
      return apiError("La factura no tiene clave de acceso. Ejecute el proceso de envío primero.");
    }

    const result = await sriService.authorizeInvoice(
      invoice.claveAcceso,
      invoice.company.ambiente,
      invoice.id
    );

    // Si hay un error en la autorización, incluir el mensaje detallado
    const resultWithMsg = result as typeof result & { mensaje?: string };
    if (result.estado !== "AUTORIZADO" && result.estado !== "AUTORIZADA" && resultWithMsg.mensaje) {
      return apiSuccess({
        ...result,
        error: resultWithMsg.mensaje, // Incluir mensaje de error explícitamente
      });
    }

    return apiSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error autorizando comprobante";
    console.error("[SRI Authorize Error]", message);
    return apiError(message, 500);
  }
}
