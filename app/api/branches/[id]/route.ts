import { NextRequest } from "next/server";
import { z } from "zod";
import { branchService } from "@/modules/branches/branch.service";
import { requireRole, apiSuccess, apiError } from "@/lib/api";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  direccion: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    const branch = await branchService.getById(id, auth.payload.companyId);
    return apiSuccess(branch);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error", 404);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const branch = await branchService.update(id, auth.payload.companyId, parsed.data);
    return apiSuccess(branch);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al actualizar");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    await branchService.delete(id, auth.payload.companyId);
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al eliminar");
  }
}
