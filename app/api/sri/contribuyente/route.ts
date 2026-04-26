export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";

/**
 * GET /api/sri/contribuyente?identificacion=1105989576001
 * Proxy hacia el servicio del SRI. Requiere headers de navegador para evitar el 406.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const identificacion = req.nextUrl.searchParams.get("identificacion")?.trim();
  if (!identificacion) return apiError("Identificación requerida", 400);

  try {
    const res = await fetch(
      `https://srienlinea.sri.gob.ec/movil-servicios/api/v1.0/deudas/porIdentificacion/${encodeURIComponent(identificacion)}`,
      {
        cache: "no-store",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "es-EC,es;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Origin": "https://srienlinea.sri.gob.ec",
          "Referer": "https://srienlinea.sri.gob.ec/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
      }
    );

    if (!res.ok) {
      return apiError(`SRI respondió con estado ${res.status}`, 502);
    }

    const data = await res.json();
    return apiSuccess(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return apiError(`No se pudo conectar con el SRI: ${msg}`, 502);
  }
}
