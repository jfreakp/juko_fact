import { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "./auth";

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status });
}

export function getAuthFromRequest(req: NextRequest): JWTPayload | null {
  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) return verifyToken(cookieToken);

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }

  return null;
}

export function requireAuth(
  req: NextRequest
): { payload: JWTPayload } | { error: Response } {
  const payload = getAuthFromRequest(req);
  if (!payload) {
    return { error: apiError("No autorizado", 401) };
  }
  return { payload };
}

export function requireRole(
  req: NextRequest,
  ...roles: string[]
): { payload: JWTPayload } | { error: Response } {
  const result = requireAuth(req);
  if ("error" in result) return result;
  if (!roles.includes(result.payload.role)) {
    return { error: apiError("Acceso denegado", 403) };
  }
  return result;
}
