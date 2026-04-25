export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  tracksInventory: z.boolean().optional(),
  costoPromedio: z.number().min(0).optional(),
  stockMinimo: z.number().min(0).optional(),
});

/**
 * PATCH /api/inventory/products/[id]
 * Actualiza campos de InventoryProduct Y propaga stockMinimo a todos sus Stock.
 * id = inventoryProduct.id
 */
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const updated = await prisma.inventoryProduct.updateMany({
      where: { id, companyId: auth.payload.companyId },
      data: parsed.data,
    });

    if (updated.count === 0) return apiError("Producto no encontrado", 404);

    // Propagar stockMinimo a todos los registros Stock de este inventoryProduct
    if (parsed.data.stockMinimo !== undefined) {
      await prisma.stock.updateMany({
        where: { inventoryProductId: id, companyId: auth.payload.companyId },
        data: { stockMinimo: parsed.data.stockMinimo },
      });
    }

    return apiSuccess({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al actualizar");
  }
}
