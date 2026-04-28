export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { cxcService } from "@/modules/cxc/cxc.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

// Formas de pago válidas para abonos (no se puede abonar con crédito)
const FORMAS_PAGO_ABONO = ["01", "15", "16", "17", "18", "20", "21"] as const;

const abonoSchema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0"),
  formaPago: z.enum(FORMAS_PAGO_ABONO, {
    error: "Forma de pago inválida para abono",
  }),
  notas: z.string().optional(),
  fecha: z.string().datetime().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = abonoSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const cxc = await cxcService.registrarAbono(id, auth.payload.companyId, {
      monto:     parsed.data.monto,
      formaPago: parsed.data.formaPago,
      notas:     parsed.data.notas,
      userId:    auth.payload.userId,
      fecha:     parsed.data.fecha ? new Date(parsed.data.fecha) : undefined,
    });

    return apiSuccess(cxc, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al registrar abono");
  }
}
