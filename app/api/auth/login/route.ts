export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/modules/auth/auth.service";
import { apiError } from "@/lib/api";

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

    const response = NextResponse.json({ success: true, data: { user } });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 8 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return apiError(message, 401);
  }
}
