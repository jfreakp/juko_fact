export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireAuth, apiSuccess, apiError } from "@/lib/api";
import { inventoryService } from "@/modules/inventory/inventory.service";

const configSchema = z.object({
  productId:       z.string().min(1),
  tracksInventory: z.boolean().optional(),
  costoPromedio:   z.number().min(0).optional(),
  stockMinimo:     z.number().min(0).optional(),
});

/** Lista productos con inventario activo. Si se pasa ?productId= devuelve sólo ese registro. */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (productId) {
      const config = await inventoryService.getInventoryProductConfig(productId);
      return apiSuccess(config ?? null);
    }
    const products = await inventoryService.getInventoryProducts(auth.payload.companyId);
    return apiSuccess(products);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al obtener productos");
  }
}

/** Activa/configura inventario en un producto */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { productId, ...data } = parsed.data;
    const result = await inventoryService.configureProduct(
      productId,
      auth.payload.companyId,
      data
    );

    // Si se cambió stockMinimo, propagar a todos los Stock existentes de este producto
    if (data.stockMinimo !== undefined) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.stock.updateMany({
        where: { inventoryProductId: result.id, companyId: auth.payload.companyId },
        data: { stockMinimo: data.stockMinimo },
      });
    }

    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al configurar producto");
  }
}
