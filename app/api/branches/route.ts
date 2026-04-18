import { NextRequest } from "next/server";
import { z } from "zod";
import { branchService } from "@/modules/branches/branch.service";
import { requireRole, apiSuccess, apiError } from "@/lib/api";

const createSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  direccion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const branches = await branchService.getAll(auth.payload.companyId);
  return apiSuccess(branches);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const branch = await branchService.create(auth.payload.companyId, parsed.data);
    return apiSuccess(branch, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear sucursal");
  }
}
