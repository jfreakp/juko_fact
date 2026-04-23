export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { companyService } from "@/modules/company/company.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const formData = await req.formData();
    const file = formData.get("certificate") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) return apiError("Archivo de certificado requerido");
    if (!password) return apiError("Contraseña del certificado requerida");
    if (!file.name.endsWith(".p12") && !file.name.endsWith(".pfx")) {
      return apiError("El certificado debe ser un archivo .p12 o .pfx");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cert = await companyService.uploadCertificate(
      auth.payload.companyId,
      buffer,
      file.name,
      password
    );

    return apiSuccess({
      id: cert.id,
      fileName: cert.fileName,
      thumbprint: cert.thumbprint,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al procesar certificado");
  }
}
