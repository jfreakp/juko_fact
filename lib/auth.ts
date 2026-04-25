import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET_DEFAULT = "change-me-in-production";
const _rawSecret = process.env.JWT_SECRET;

// S-01: Forzar JWT_SECRET real en producción. Un secret conocido públicamente
// permite forjar tokens válidos para cualquier usuario/empresa.
if (process.env.NODE_ENV === "production" && (!_rawSecret || _rawSecret === JWT_SECRET_DEFAULT)) {
  throw new Error(
    "FATAL: JWT_SECRET no está configurado o usa el valor por defecto. " +
    "Establece JWT_SECRET en las variables de entorno antes de iniciar en producción."
  );
}

const JWT_SECRET = _rawSecret ?? JWT_SECRET_DEFAULT;
const COOKIE_NAME = "auth_token";
const EXPIRES_IN = "8h";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  branchId: string | null;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function createAuthCookieHeader(token: string): string {
  const maxAge = 8 * 60 * 60; // 8 hours in seconds
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearAuthCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
