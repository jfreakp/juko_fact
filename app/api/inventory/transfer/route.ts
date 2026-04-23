export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, apiSuccess, apiError } from "@/lib/api";
import { inventoryService } from "@/modules/inventory/inventory.service";

const transferSchema = z.object({
  fromBranchId: z.string().min(1, "Sucursal origen requerida"),
  toBranchId:   z.string().min(1, "Sucursal destino requerida"),
  notas:        z.string().optional(),
  items: z
    .array(
      z.object({
        productId:     z.string().min(1),
        cantidad:      z.number().positive("Cantidad debe ser positiva"),
        costoUnitario: z.number().min(0),
      })
    )
    .min(1, "Se requiere al menos un producto"),
});

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;

  try {
    const transfers = await inventoryService.getTransfers(auth.payload.companyId, branchId);
    return apiSuccess(transfers);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al obtener transferencias");
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const transfer = await inventoryService.createTransfer({
      companyId: auth.payload.companyId,
      userId: auth.payload.userId,
      ...parsed.data,
    });

    return apiSuccess(transfer, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear transferencia");
  }
}
