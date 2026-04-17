import { NextRequest } from "next/server";
import { z } from "zod";
import { clientService } from "@/modules/clients/client.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

const clientSchema = z.object({
  tipoIdentif: z.enum(["CEDULA", "RUC", "PASAPORTE", "CONSUMIDOR_FINAL"]),
  identificacion: z.string().min(1, "Identificación requerida"),
  razonSocial: z.string().min(1, "Razón social requerida"),
  direccion: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const clients = await clientService.getAll(auth.payload.companyId, search);
  return apiSuccess(clients);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const body = await req.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const client = await clientService.create(auth.payload.companyId, parsed.data);
    return apiSuccess(client, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al crear cliente");
  }
}
