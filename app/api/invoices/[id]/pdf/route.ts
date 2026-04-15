import { NextRequest } from "next/server";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { generateRIDEHtml } from "@/modules/sri/pdf.generator";
import { requireAuth, apiError } from "@/lib/api";

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
    const html = generateRIDEHtml(invoice as Parameters<typeof generateRIDEHtml>[0]);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Disposition": `inline; filename="RIDE-${invoice.secuencial}.html"`,
      },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error", 404);
  }
}
