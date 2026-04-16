/**
 * Generates a 49-digit SRI access key (clave de acceso).
 *
 * Structure:
 *  [01-08]  fechaEmision    DD/MM/YYYY
 *  [09-10]  tipoComprobante "01" for factura
 *  [11-23]  ruc             13 digits
 *  [24]     ambiente        1=PRUEBAS, 2=PRODUCCION
 *  [25-27]  estab           3 digits
 *  [28-30]  ptoEmi          3 digits
 *  [31-39]  secuencial      9 digits
 *  [40-47]  codigoNumerico  8 digits — sequential counter stored per company
 *  [48]     tipoEmision     1=NORMAL
 *  [49]     digitoVerificador module-11
 */
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

  const day = fechaEmision.getDate().toString().padStart(2, "0");
  const month = (fechaEmision.getMonth() + 1).toString().padStart(2, "0");
  const year = fechaEmision.getFullYear().toString();

  const fecha = `${day}${month}${year}`;
  const ambienteCode = ambiente === "PRODUCCION" ? "2" : "1";
  const establ = estab.padStart(3, "0");
  const pto = ptoEmi.padStart(3, "0");
  const seq = secuencial.padStart(9, "0");

  const base =
    fecha +
    tipoComprobante +
    ruc +
    ambienteCode +
    establ +
    pto +
    seq +
    codigoNumerico +
    tipoEmision;

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
