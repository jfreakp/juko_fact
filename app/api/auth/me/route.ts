export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/auth.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const user = await authService.me(auth.payload.userId);
    return apiSuccess(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return apiError(message, 404);
  }
}
