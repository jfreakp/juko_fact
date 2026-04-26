/**
 * Generates a 49-digit SRI access key (clave de acceso).
 *
 * Structure (SRI Ecuador spec):
 *  [01-08]  fechaEmision    ddmmaaaa  (8 digits)
 *  [09-10]  tipoComprobante Tabla 3   (2 digits) — "01" = Factura
 *  [11-23]  ruc             13 digits
 *  [24]     ambiente        Tabla 4   (1 digit)  — 1=PRUEBAS, 2=PRODUCCION
 *  [25-30]  serie           estab(3) + ptoEmi(3) (6 digits)
 *  [31-39]  secuencial      9 digits
 *  [40-47]  codigoNumerico  8 digits — sequential counter stored per company
 *  [48]     tipoEmision     Tabla 2   (1 digit)  — 1=NORMAL, 2=INDISPONIBILIDAD
 *  [49]     digitoVerificador módulo 11 (1 digit)
 */

import { toEcuadorDateParts } from "@/lib/ecuador-date";

export function generateAccessKey(params: {
  fechaEmision: Date;
  tipoComprobante?: string;
  ruc: string;
  ambiente: "PRUEBAS" | "PRODUCCION";
  estab: string;
  ptoEmi: string;
  secuencial: string;
  tipoEmision?: string;
  /** 8-digit sequential code from the company counter (companyRepository.getNextCodigoNumerico) */
  codigoNumerico: string;
}): string {
  const {
    fechaEmision,
    tipoComprobante = "01",
    ruc,
    ambiente,
    estab, 
    ptoEmi,
    secuencial,
    tipoEmision = "1",
    codigoNumerico,
  } = params;

  // F-01: Validar RUC — debe tener exactamente 13 dígitos.
  // Un RUC inválido genera una clave de acceso rechazada por el SRI sin mensaje claro.
  if (ruc.length !== 13) {
    throw new Error(
      `RUC inválido: debe tener 13 dígitos (recibido: "${ruc}", longitud: ${ruc.length}). ` +
      "Verifique la configuración de la empresa."
    );
  }

  if (!/^\d{13}$/.test(ruc)) {
    throw new Error(
      `RUC inválido: debe contener solo dígitos (recibido: "${ruc}"). ` +
      "Verifique la configuración de la empresa."
    );
  }

  if (codigoNumerico.length !== 8) {
    throw new Error(`codigoNumerico debe tener 8 dígitos (recibido: ${codigoNumerico.length})`);
  }
  if (tipoEmision !== "1" && tipoEmision !== "2") {
    throw new Error(`tipoEmision debe ser "1" (NORMAL) o "2" (INDISPONIBILIDAD), recibido: "${tipoEmision}"`);
  }

  // F-04: Extraer componentes de fecha en hora local Ecuador (UTC-5).
  // Usar getDate()/getMonth() UTC causaría fecha incorrecta para facturas
  // creadas entre 19:00 y 23:59 hora Ecuador (UTC 00:00-04:59 del día siguiente).
  const { day, month, year } = toEcuadorDateParts(fechaEmision);

  const fecha = `${day}${month}${year}`;            // ddmmaaaa  (8)
  const ambienteCode = ambiente === "PRODUCCION" ? "2" : "1";
  const establ = estab.padStart(3, "0");            // 3 dígitos
  const pto = ptoEmi.padStart(3, "0");              // 3 dígitos → serie = 6
  const seq = secuencial.padStart(9, "0");          // 9 dígitos

  const base =
    fecha +            //  8
    tipoComprobante +  //  2
    ruc +              // 13
    ambienteCode +     //  1
    establ +           //  3 ┐ serie
    pto +              //  3 ┘ = 6
    seq +              //  9
    codigoNumerico +   //  8
    tipoEmision;       //  1  → total base = 48

  if (base.length !== 48) {
    throw new Error(
      `Error generando clave de acceso: longitud incorrecta (${base.length}/48)`
    );
  }

  const verifier = computeModulo11(base);
  return base + verifier.toString();
}

/**
 * Computes the module-11 check digit.
 */
function computeModulo11(value: string): number {
  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = value.length - 1; i >= 0; i--) {
    const digit = parseInt(value[i], 10);
    const weight = weights[(value.length - 1 - i) % weights.length];
    sum += digit * weight;
  }

  const remainder = sum % 11;
  const verifier = 11 - remainder;

  if (verifier === 11) return 0;
  if (verifier === 10) return 1;
  return verifier;
}
