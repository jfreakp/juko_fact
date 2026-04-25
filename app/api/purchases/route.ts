export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { purchaseService } from "@/modules/purchases/purchase.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const itemSchema = z.object({
  productId: z.string().optional(),
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().positive("Cantidad debe ser positiva"),
  costoUnitario: z.number().min(0, "Costo no puede ser negativo"),
});

const createSchema = z.object({
  supplierId: z.string().optional(),
  branchId: z.string().min(1, "Sucursal requerida"),
  tipoDocumento: z
    .enum(["FACTURA", "NOTA_ENTREGA", "LIQUIDACION_COMPRA", "OTRO"])
    .optional(),
  numeroDocumento: z.string().optional(),
  fechaCompra: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(itemSchema).min(1, "Debe tener al menos un ítem"),
});

function parseDate(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const params = req.nextUrl.searchParams;
  const from = parseDate(params.get("from"));
  const to = parseDate(params.get("to"));
  const supplierId = params.get("supplierId") ?? undefined;
  const branchId = params.get("branchId") ?? undefined;

  const purchases = await purchaseService.getAll(auth.payload.companyId, {
    from,
    to,
    supplierId,
    branchId,
  });
  return apiSuccess(purchases);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const purchase = await purchaseService.create({
      companyId: auth.payload.companyId,
      userId: auth.payload.userId,
      branchId: parsed.data.branchId,
      supplierId: parsed.data.supplierId,
      tipoDocumento: parsed.data.tipoDocumento,
      numeroDocumento: parsed.data.numeroDocumento,
      fechaCompra: parseDate(parsed.data.fechaCompra),
      notas: parsed.data.notas,
      items: parsed.data.items,
    });
    return apiSuccess(purchase, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al registrar compra");
  }
}
