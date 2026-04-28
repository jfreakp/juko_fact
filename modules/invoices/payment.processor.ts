/**
 * payment.processor.ts
 *
 * Procesador de pagos para facturación electrónica SRI Ecuador.
 * Valida, interpreta lógica de negocio y genera el bloque XML <pagos>.
 *
 * Soporta: contado, crédito (19) y pagos mixtos.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UnidadTiempo = "dias" | "meses" | "anios";

export interface PagoInput {
  formaPago: string;
  monto: number;
  plazo?: number;
  unidadTiempo?: UnidadTiempo;
}

export interface FacturaInput {
  fechaEmision: string; // YYYY-MM-DD
  total: number;
  pagos: PagoInput[];
}

export interface ValidationResult {
  esValido: boolean;
  errores: string[];
  advertencias: string[];
}

export interface CuentaPorCobrar {
  total: number;
  saldo: number;
  fechaVencimiento: Date;
  estado: "pendiente";
}

export interface NegocioResult {
  tieneCredito: boolean;
  fechaVencimiento: Date | null;
  cuentaPorCobrar: CuentaPorCobrar | null;
}

export interface ProcessorResult {
  validacion: ValidationResult;
  negocio: NegocioResult;
  xml: { bloquePagos: string } | null;
  recomendaciones: string[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CODIGO_CREDITO = "19";

/** Tabla 24 SRI — formas de pago reconocidas */
const FORMAS_PAGO_SRI: Record<string, string> = {
  "01": "Sin utilización del sistema financiero",
  "15": "Compensación de deudas",
  "16": "Tarjeta de débito",
  "17": "Dinero electrónico",
  "18": "Tarjeta prepago",
  "19": "Tarjeta de crédito / Crédito",
  "20": "Otros con utilización del sistema financiero",
  "21": "Endoso de títulos",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula la fecha de vencimiento a partir de la fecha de emisión.
 * JavaScript Date.setMonth() maneja correctamente meses con distinto
 * número de días (ej: 31 ene + 1 mes → 28/29 feb).
 * setFullYear() maneja años bisiestos.
 */
function calcFechaVencimiento(
  fechaEmision: Date,
  plazo: number,
  unidadTiempo: UnidadTiempo
): Date {
  // Clonar para no mutar el original
  const fecha = new Date(fechaEmision.getTime());

  switch (unidadTiempo) {
    case "dias":
      fecha.setDate(fecha.getDate() + plazo);
      break;
    case "meses":
      fecha.setMonth(fecha.getMonth() + plazo);
      break;
    case "anios":
      fecha.setFullYear(fecha.getFullYear() + plazo);
      break;
  }

  return fecha;
}

// ─── 1. Validación ────────────────────────────────────────────────────────────

function validarPagos(input: FacturaInput): ValidationResult {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaEmision)) {
    errores.push("fechaEmision debe tener formato YYYY-MM-DD");
  } else {
    const d = new Date(input.fechaEmision + "T00:00:00");
    if (isNaN(d.getTime())) {
      errores.push("fechaEmision no es una fecha válida");
    }
  }

  // Total
  if (typeof input.total !== "number" || input.total <= 0) {
    errores.push("total debe ser un número mayor a 0");
  }

  // Pagos array
  if (!Array.isArray(input.pagos) || input.pagos.length === 0) {
    errores.push("Debe existir al menos una forma de pago");
    return { esValido: false, errores, advertencias };
  }

  let sumaPagos = 0;
  const codigosUsados = new Set<string>();

  for (let i = 0; i < input.pagos.length; i++) {
    const p = input.pagos[i];
    const ctx = `pagos[${i}]`;

    // Monto
    if (typeof p.monto !== "number" || p.monto <= 0) {
      errores.push(`${ctx}: monto debe ser un número mayor a 0`);
    } else {
      sumaPagos = round2(sumaPagos + p.monto);
    }

    // formaPago obligatorio
    if (!p.formaPago || typeof p.formaPago !== "string") {
      errores.push(`${ctx}: formaPago es obligatorio`);
      continue;
    }

    // formaPago conocida (advertencia, no error — el SRI puede aceptar otras)
    if (!FORMAS_PAGO_SRI[p.formaPago]) {
      advertencias.push(
        `${ctx}: formaPago "${p.formaPago}" no está en la Tabla 24 SRI. Verifique el código.`
      );
    }

    // Sin duplicados
    if (codigosUsados.has(p.formaPago)) {
      errores.push(
        `${ctx}: formaPago "${p.formaPago}" ya existe en otro pago. No se permiten duplicados.`
      );
    }
    codigosUsados.add(p.formaPago);

    // Reglas específicas de crédito (19)
    if (p.formaPago === CODIGO_CREDITO) {
      if (p.plazo === undefined || p.plazo === null) {
        errores.push(`${ctx}: crédito (19) requiere "plazo"`);
      } else if (typeof p.plazo !== "number" || !Number.isInteger(p.plazo) || p.plazo <= 0) {
        errores.push(`${ctx}: plazo debe ser un entero mayor a 0`);
      }

      if (!p.unidadTiempo) {
        errores.push(`${ctx}: crédito (19) requiere "unidadTiempo" ("dias", "meses", "anios")`);
      } else if (!["dias", "meses", "anios"].includes(p.unidadTiempo)) {
        errores.push(
          `${ctx}: unidadTiempo "${p.unidadTiempo}" inválido. Use "dias", "meses" o "anios"`
        );
      }
    } else {
      // No-crédito: plazo y unidadTiempo no deben estar presentes
      if (p.plazo !== undefined && p.plazo !== null) {
        advertencias.push(
          `${ctx}: formaPago "${p.formaPago}" no es crédito — "plazo" será ignorado en el XML`
        );
      }
      if (p.unidadTiempo !== undefined && p.unidadTiempo !== null) {
        advertencias.push(
          `${ctx}: formaPago "${p.formaPago}" no es crédito — "unidadTiempo" será ignorado en el XML`
        );
      }
    }
  }

  // Suma de pagos == total
  if (input.total > 0 && Math.abs(sumaPagos - input.total) > 0.01) {
    errores.push(
      `La suma de los pagos ($${sumaPagos.toFixed(2)}) no coincide con el total ($${input.total.toFixed(2)}). ` +
      `Diferencia: $${Math.abs(sumaPagos - input.total).toFixed(2)}`
    );
  }

  return { esValido: errores.length === 0, errores, advertencias };
}

// ─── 2. Lógica de negocio ─────────────────────────────────────────────────────

function procesarNegocio(input: FacturaInput): NegocioResult {
  const pagoCredito = input.pagos.find((p) => p.formaPago === CODIGO_CREDITO);

  if (!pagoCredito || !pagoCredito.plazo || !pagoCredito.unidadTiempo) {
    return { tieneCredito: false, fechaVencimiento: null, cuentaPorCobrar: null };
  }

  // Parsear fecha de emisión como hora local Ecuador (no UTC)
  const fechaBase = new Date(input.fechaEmision + "T00:00:00");

  const fechaVencimiento = calcFechaVencimiento(
    fechaBase,
    pagoCredito.plazo,
    pagoCredito.unidadTiempo
  );

  const cuentaPorCobrar: CuentaPorCobrar = {
    total: round2(pagoCredito.monto),
    saldo: round2(pagoCredito.monto),
    fechaVencimiento,
    estado: "pendiente",
  };

  return { tieneCredito: true, fechaVencimiento, cuentaPorCobrar };
}

// ─── 3. Generación XML ────────────────────────────────────────────────────────

function generarXmlPagos(pagos: PagoInput[]): string {
  const lines: string[] = ["<pagos>"];

  for (const p of pagos) {
    lines.push("  <pago>");
    lines.push(`    <formaPago>${p.formaPago}</formaPago>`);
    lines.push(`    <total>${p.monto.toFixed(2)}</total>`);

    // plazo y unidadTiempo SOLO para crédito (código 19)
    if (p.formaPago === CODIGO_CREDITO && p.plazo && p.unidadTiempo) {
      lines.push(`    <plazo>${p.plazo}</plazo>`);
      lines.push(`    <unidadTiempo>${p.unidadTiempo}</unidadTiempo>`);
    }

    lines.push("  </pago>");
  }

  lines.push("</pagos>");
  return lines.join("\n");
}

// ─── 4. Recomendaciones ───────────────────────────────────────────────────────

function generarRecomendaciones(
  input: FacturaInput,
  negocio: NegocioResult
): string[] {
  const recs: string[] = [];

  // Efectivo sobre umbral AML
  const efectivo = input.pagos.find((p) => p.formaPago === "01");
  if (efectivo && efectivo.monto > 5000) {
    recs.push(
      "Pago en efectivo mayor a $5,000: verifique cumplimiento de la Ley de Prevención " +
      "de Lavado de Activos (UAFE). Considere solicitar justificación del origen de fondos."
    );
  }

  // Vencimiento ya pasado
  if (negocio.tieneCredito && negocio.fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(negocio.fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    const diasRestantes = Math.ceil(
      (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasRestantes < 0) {
      recs.push(
        `La fecha de vencimiento (${venc.toLocaleDateString("es-EC")}) ya expiró. ` +
        "Verifique el plazo ingresado."
      );
    } else if (diasRestantes <= 7) {
      recs.push(
        `La cuenta por cobrar vence en ${diasRestantes} día(s). Configure una alerta de cobro.`
      );
    } else if (diasRestantes > 365) {
      recs.push(
        `Plazo de crédito mayor a 1 año (${diasRestantes} días). ` +
        "Evalúe si aplica interés por mora según contrato."
      );
    }
  }

  // Pago mixto
  if (input.pagos.length > 1 && negocio.tieneCredito) {
    const montoContado = round2(
      input.pagos
        .filter((p) => p.formaPago !== CODIGO_CREDITO)
        .reduce((s, p) => s + p.monto, 0)
    );
    recs.push(
      `Pago mixto: $${montoContado.toFixed(2)} de contado cobrados al momento de emisión. ` +
      `La CxC solo registra el saldo crediticio ($${negocio.cuentaPorCobrar!.total.toFixed(2)}).`
    );
  }

  // Plazo en años — verificar compatibilidad SRI
  if (input.pagos.some((p) => p.formaPago === CODIGO_CREDITO && p.unidadTiempo === "anios")) {
    recs.push(
      'unidadTiempo "anios" no está documentado en los esquemas XSD oficiales del SRI. ' +
      'Prefiera "meses" para plazos largos (ej: 12 meses en lugar de 1 año).'
    );
  }

  return recs;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Procesa una factura: valida, interpreta negocio, genera XML y devuelve recomendaciones.
 *
 * @example
 * const resultado = procesarFactura({
 *   fechaEmision: "2026-04-28",
 *   total: 150.00,
 *   pagos: [
 *     { formaPago: "01", monto: 50.00 },
 *     { formaPago: "19", monto: 100.00, plazo: 30, unidadTiempo: "dias" },
 *   ],
 * });
 */
export function procesarFactura(input: FacturaInput): ProcessorResult {
  const validacion = validarPagos(input);

  if (!validacion.esValido) {
    return {
      validacion,
      negocio: { tieneCredito: false, fechaVencimiento: null, cuentaPorCobrar: null },
      xml: null,
      recomendaciones: [
        "Corrija los errores de validación antes de generar el comprobante electrónico.",
      ],
    };
  }

  const negocio = procesarNegocio(input);
  const bloquePagos = generarXmlPagos(input.pagos);
  const recomendaciones = generarRecomendaciones(input, negocio);

  return {
    validacion,
    negocio,
    xml: { bloquePagos },
    recomendaciones,
  };
}
