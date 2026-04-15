import { NextRequest } from "next/server";
import { z } from "zod";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const detailSchema = z.object({
  productId: z.string().optional(),
  codigoPrincipal: z.string().min(1, "Código requerido"),
  codigoAuxiliar: z.string().optional(),
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().positive("Cantidad debe ser positiva"),
  precioUnitario: z.number().positive("Precio debe ser positivo"),
  descuento: z.number().min(0).optional(),
  tipoIva: z.enum(["IVA_0", "IVA_5", "IVA_12", "IVA_15", "NO_APLICA"]),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  fechaEmision: z.string().optional(),
  details: z.array(detailSchema).min(1, "Se requiere al menos un detalle"),
  observaciones: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const params = req.nextUrl.searchParams;
  const result = await invoiceService.getAll(auth.payload.companyId, {
    estado: params.get("estado") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.get("page") ? parseInt(params.get("page")!) : undefined,
    limit: params.get("limit") ? parseInt(params.get("limit")!) : undefined,
  });

  return apiSuccess(result);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const invoice = await invoiceService.create(auth.payload.companyId, parsed.data);
    return apiSuccess(invoice, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear factura");
  }
}
