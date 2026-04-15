import { NextRequest } from "next/server";
import { z } from "zod";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess, apiError } from "@/lib/api";
import { createAuthCookieHeader } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { token, user } = await authService.login(parsed.data);

    return new Response(
      JSON.stringify({ success: true, data: { user } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createAuthCookieHeader(token),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return apiError(message, 401);
  }
}
