export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, apiSuccess, apiError } from "@/lib/api";
import { inventoryService } from "@/modules/inventory/inventory.service";

const adjustmentSchema = z.object({
  productId:     z.string().min(1, "Producto requerido"),
  branchId:      z.string().min(1, "Sucursal requerida"),
  cantidad:      z.number().refine((n) => n !== 0, "Cantidad no puede ser cero"),
  costoUnitario: z.number().min(0, "Costo debe ser mayor o igual a cero"),
  notas:         z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    await inventoryService.createAdjustment({
      companyId: auth.payload.companyId,
      userId: auth.payload.userId,
      ...parsed.data,
    });

    return apiSuccess({ message: "Ajuste registrado" }, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al registrar ajuste");
  }
}
