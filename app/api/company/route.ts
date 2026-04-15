import { NextRequest } from "next/server";
import { z } from "zod";
import { companyService } from "@/modules/company/company.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const updateSchema = z.object({
  ruc: z.string().length(13).optional(),
  razonSocial: z.string().min(1).optional(),
  nombreComercial: z.string().optional(),
  dirMatriz: z.string().min(1).optional(),
  estab: z.string().length(3).optional(),
  ptoEmi: z.string().length(3).optional(),
  contribuyenteEsp: z.string().optional(),
  obligadoContab: z.boolean().optional(),
  ambiente: z.enum(["PRUEBAS", "PRODUCCION"]).optional(),
  tipoEmision: z.enum(["NORMAL", "INDISPONIBILIDAD"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const company = await companyService.getCompany(auth.payload.companyId);
    return apiSuccess(company);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error", 404);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const company = await companyService.updateCompany(
      auth.payload.companyId,
      parsed.data
    );
    return apiSuccess(company);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error");
  }
}
