export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { userService } from "@/modules/users/user.service";
import { requireRole, apiSuccess, apiError } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "EMPLOYED"]).default("EMPLOYED"),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const users = await userService.getAll(auth.payload.companyId);
  return apiSuccess(users);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const user = await userService.create(auth.payload.companyId, parsed.data);
    return apiSuccess(user, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear usuario");
  }
}
