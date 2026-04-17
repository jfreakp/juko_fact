import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { generateRIDEHtml } from "@/modules/sri/pdf.generator";
import { requireAuth, apiError } from "@/lib/api";

async function logoToDataUri(logoUrl: string | null): Promise<string | undefined> {
  if (!logoUrl) return undefined;
  try {
    // logoUrl is like /uploads/logo-{id}.png — resolve from public/
    const filePath = join(process.cwd(), "public", logoUrl);
    const buffer = await readFile(filePath);
    const ext = logoUrl.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "svg" ? "image/svg+xml"
      : ext === "webp" ? "image/webp"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined; // logo file missing — skip silently
  }
}

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
    const logoDataUri = await logoToDataUri(
      (invoice.company as { logoUrl?: string | null }).logoUrl ?? null
    );
    const html = generateRIDEHtml(
      invoice as Parameters<typeof generateRIDEHtml>[0],
      logoDataUri
    );

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
