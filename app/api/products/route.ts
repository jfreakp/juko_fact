import { NextRequest } from "next/server";
import { z } from "zod";
import { productService } from "@/modules/products/product.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const productSchema = z.object({
  codigoPrincipal: z.string().min(1, "Código principal requerido"),
  codigoAuxiliar: z.string().optional(),
  descripcion: z.string().min(1, "Descripción requerida"),
  precio: z.number().positive("Precio debe ser positivo"),
  tipoIva: z.enum(["IVA_0", "IVA_5", "IVA_12", "IVA_15", "NO_APLICA"]),
  tipo: z.enum(["BIEN", "SERVICIO"]),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const products = await productService.getAll(auth.payload.companyId, search);
  return apiSuccess(products);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const product = await productService.create(auth.payload.companyId, parsed.data);
    return apiSuccess(product, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear producto");
  }
}
