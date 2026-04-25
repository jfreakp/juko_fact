export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { supplierService } from "@/modules/suppliers/supplier.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const updateSchema = z.object({
  ruc: z.string().optional(),
  nombre: z.string().min(1).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  const supplier = await supplierService.getById(id, auth.payload.companyId);
  if (!supplier) return apiError("Proveedor no encontrado", 404);
  return apiSuccess(supplier);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    await supplierService.update(id, auth.payload.companyId, {
      ...parsed.data,
      email: parsed.data.email || undefined,
    });
    const updated = await supplierService.getById(id, auth.payload.companyId);
    return apiSuccess(updated);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al actualizar proveedor");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const { id } = await params;
  await supplierService.delete(id, auth.payload.companyId);
  return apiSuccess({ ok: true });
}
