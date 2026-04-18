import { NextRequest } from "next/server";
import { z } from "zod";
import { userService } from "@/modules/users/user.service";
import { requireRole, apiSuccess, apiError } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EMPLOYED"]).optional(),
  branchId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    const user = await userService.getById(id, auth.payload.companyId);
    return apiSuccess(user);
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

    const user = await userService.update(id, auth.payload.companyId, parsed.data);
    return apiSuccess(user);
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
    await userService.deactivate(id, auth.payload.companyId, auth.payload.userId);
    return apiSuccess({ deactivated: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al desactivar");
  }
}
