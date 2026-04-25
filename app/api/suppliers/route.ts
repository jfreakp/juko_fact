export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { supplierService } from "@/modules/suppliers/supplier.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const createSchema = z.object({
  ruc: z.string().optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const suppliers = await supplierService.getAll(auth.payload.companyId, search);
  return apiSuccess(suppliers);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const supplier = await supplierService.create({
      companyId: auth.payload.companyId,
      ...parsed.data,
      email: parsed.data.email || undefined,
    });
    return apiSuccess(supplier, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear proveedor");
  }
}
