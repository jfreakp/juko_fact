/**
 * Utilidades de fecha para Ecuador (America/Guayaquil, UTC-5, sin horario de verano).
 *
 * Regla de oro:
 *  - Las fechas se almacenan en la DB como UTC (comportamiento por defecto de Prisma/PG).
 *  - Para MOSTRAR o FORMATEAR (XML SRI, clave de acceso) siempre usar toEcuadorDateParts().
 *  - Para PARSEAR una cadena "YYYY-MM-DD" venida del frontend usar parseEcuadorDate().
 */

/** Ecuador está a UTC-5 (sin DST). */
export const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000; // 5 h en ms

/**
 * Extrae { day, month, year } en hora local de Ecuador a partir de un Date UTC.
 * Úsalo en lugar de getDate() / getMonth() / getFullYear() directamente.
 */
export function toEcuadorDateParts(utcDate: Date): {
  day: string;
  month: string;
  year: string;
} {
  // Restamos 5 h al timestamp UTC → obtenemos el instante "Ecuador local" como si fuera UTC
  const shifted = new Date(utcDate.getTime() - ECUADOR_OFFSET_MS);
  return {
    day: shifted.getUTCDate().toString().padStart(2, "0"),
    month: (shifted.getUTCMonth() + 1).toString().padStart(2, "0"),
    year: shifted.getUTCFullYear().toString(),
  };
}

/**
 * Formatea un Date UTC como "dd/mm/yyyy" en hora local de Ecuador.
 * Formato requerido por el SRI en <fechaEmision> y en la clave de acceso.
 */
export function formatEcuadorDate(utcDate: Date): string {
  const { day, month, year } = toEcuadorDateParts(utcDate);
  return `${day}/${month}/${year}`;
}

/**
 * Interpreta una cadena "YYYY-MM-DD" como medianoche en Ecuador (UTC-5).
 * "2026-04-23" → 2026-04-23T05:00:00.000Z (= medianoche Ecuador = 05:00 UTC)
 *
 * Úsalo en lugar de new Date(dateStr) cuando el usuario envía solo la fecha.
 */
export function parseEcuadorDate(dateStr: string): Date {
  // Medianoche Ecuador = 05:00 UTC del mismo día
  return new Date(`${dateStr}T05:00:00.000Z`);
}

/**
 * Retorna la fecha actual en Ecuador como "YYYY-MM-DD".
 * Útil para defaults de fechaEmision cuando el cliente no la envía.
 */
export function todayEcuadorString(): string {
  const { day, month, year } = toEcuadorDateParts(new Date());
  return `${year}-${month}-${day}`;
}
