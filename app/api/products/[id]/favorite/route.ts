import { NextRequest } from "next/server";
import { z } from "zod";
import { productService } from "@/modules/products/product.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const favoriteSchema = z.object({
  isFavorite: z.boolean(),
});

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
    const parsed = favoriteSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    if (parsed.data.isFavorite) {
      await productService.markFavorite(id, auth.payload.companyId);
    } else {
      await productService.unmarkFavorite(id, auth.payload.companyId);
    }
    return apiSuccess({ id, isFavorite: parsed.data.isFavorite });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al actualizar favorito");
  }
}
