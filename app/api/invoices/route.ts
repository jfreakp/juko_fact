export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

// Tabla 24 SRI Ecuador — formas de pago válidas
const FORMAS_PAGO_VALIDAS = [
  "01", // Sin utilización del sistema financiero (contado/efectivo)
  "15", // Compensación de deudas
  "16", // Tarjeta de débito
  "17", // Dinero electrónico
  "18", // Tarjeta prepago
  "19", // Tarjeta de crédito
  "20", // Otros con utilización del sistema financiero
  "21", // Endoso de títulos
] as const;

const detailSchema = z
  .object({
    productId: z.string().optional(),
    codigoPrincipal: z.string().min(1, "Código requerido"),
    codigoAuxiliar: z.string().optional(),
    descripcion: z.string().min(1, "Descripción requerida"),
    // E-01: Cantidad y precio deben ser positivos
    cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
    precioUnitario: z.number().positive("Precio unitario debe ser mayor a 0"),
    // E-02: Descuento no puede ser negativo (el máximo lo valida el servicio)
    descuento: z.number().min(0, "Descuento no puede ser negativo").optional(),
    tipoIva: z.enum(["IVA_0", "IVA_5", "IVA_STANDARD", "NO_APLICA"]),
  })
  .refine(
    (d) => (d.descuento ?? 0) <= d.cantidad * d.precioUnitario,
    { message: "El descuento no puede exceder el subtotal de la línea", path: ["descuento"] }
  );

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  // E-03: Validar formato de fecha — la restricción de fecha futura se hace en el servicio
  fechaEmision: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, use YYYY-MM-DD")
    .optional(),
  details: z.array(detailSchema).min(1, "Se requiere al menos un detalle"),
  observaciones: z.string().optional(),
  // Validar contra Tabla 24 SRI
  formaPago: z
    .enum(FORMAS_PAGO_VALIDAS, {
      error: `Forma de pago inválida. Valores válidos: ${FORMAS_PAGO_VALIDAS.join(", ")}`,
    })
    .optional(),
  montoPagado: z
    .number()
    .min(0, "El monto pagado no puede ser negativo")
    .multipleOf(0.01, "Máximo 2 decimales permitidos")
    .optional(),
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

    const invoice = await invoiceService.create(
      auth.payload.companyId,
      parsed.data,
      auth.payload.branchId ?? undefined,
      auth.payload.userId
    );
    return apiSuccess(invoice, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear factura");
  }
}
