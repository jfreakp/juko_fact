// ─── Business Type System ─────────────────────────────────────────────────────
// Central configuration that drives per-business-type behavior across the app.
// Add a new key here to unlock a new business type everywhere.

export type BusinessType =
  | "GENERAL"
  | "PHARMACY"
  | "LIQUOR_STORE"
  | "GROCERY"
  | "RESTAURANT"
  | "CLOTHING_STORE"
  | "HARDWARE_STORE";

// ─── Product extra fields ──────────────────────────────────────────────────────
// Controls which extra fields appear in the product create/edit modal.

export interface ProductFields {
  // Pharmacy / Grocery
  lote: boolean;              // batch number
  fechaVencimiento: boolean;  // expiry date
  // Pharmacy
  registroSanitario: boolean; // sanitary registry number (ARCSA)
  requiereReceta: boolean;    // requires prescription
  principioActivo: boolean;   // active ingredient
  // Liquor
  gradosAlcohol: boolean;     // alcohol degrees (%)
  volumenMl: boolean;         // volume in ml
  paisOrigen: boolean;        // country of origin
  // Grocery / Hardware
  codigoBarras: boolean;      // EAN-13 / UPC barcode for scanner
  unidadMedida: boolean;      // show unit selector (kg, m, caja…)
}

// ─── Sale flow flags ──────────────────────────────────────────────────────────
// Controls UI hints / warnings shown when creating an invoice.

export interface SaleFlags {
  showRecetaWarning: boolean;     // pharmacy: prescription warning
  showAgeVerification: boolean;   // liquor: age verification reminder
  showMesa: boolean;              // restaurant: table/mesa field
  showPropinaSugerida: boolean;   // restaurant: suggested tip
}

// ─── Module flags ─────────────────────────────────────────────────────────────
// Controls which sidebar modules are visible.

export interface ModuleFlags {
  inventory: boolean;
}

// ─── Validation rules ─────────────────────────────────────────────────────────

export interface ValidationRules {
  requireExpiryDate: boolean; // expiry date is mandatory (not just optional)
}

// ─── Full config shape ────────────────────────────────────────────────────────

export interface BusinessConfig {
  label: string;
  description: string;
  productFields: ProductFields;
  saleFlags: SaleFlags;
  modules: ModuleFlags;
  validations: ValidationRules;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const NO_EXTRA_FIELDS: ProductFields = {
  lote: false,
  fechaVencimiento: false,
  registroSanitario: false,
  requiereReceta: false,
  principioActivo: false,
  gradosAlcohol: false,
  volumenMl: false,
  paisOrigen: false,
  codigoBarras: false,
  unidadMedida: false,
};

const NO_SALE_FLAGS: SaleFlags = {
  showRecetaWarning: false,
  showAgeVerification: false,
  showMesa: false,
  showPropinaSugerida: false,
};

// ─── Config map ───────────────────────────────────────────────────────────────

export const BUSINESS_CONFIGS: Record<BusinessType, BusinessConfig> = {
  GENERAL: {
    label: "General",
    description: "Tienda genérica",
    productFields: NO_EXTRA_FIELDS,
    saleFlags: NO_SALE_FLAGS,
    modules: { inventory: true },
    validations: { requireExpiryDate: false },
  },

  PHARMACY: {
    label: "Farmacia",
    description: "Farmacia y droguería",
    productFields: {
      ...NO_EXTRA_FIELDS,
      lote: true,
      fechaVencimiento: true,
      registroSanitario: true,
      requiereReceta: true,
      principioActivo: true,
      codigoBarras: true,
    },
    saleFlags: { ...NO_SALE_FLAGS, showRecetaWarning: true },
    modules: { inventory: true },
    validations: { requireExpiryDate: true },
  },

  LIQUOR_STORE: {
    label: "Licorera",
    description: "Licorería y bebidas alcohólicas",
    productFields: {
      ...NO_EXTRA_FIELDS,
      gradosAlcohol: true,
      volumenMl: true,
      paisOrigen: true,
    },
    saleFlags: { ...NO_SALE_FLAGS, showAgeVerification: true },
    modules: { inventory: true },
    validations: { requireExpiryDate: false },
  },

  GROCERY: {
    label: "Minimarket",
    description: "Minimarket y abarrotes",
    productFields: {
      ...NO_EXTRA_FIELDS,
      lote: true,
      fechaVencimiento: true,
      codigoBarras: true,
      unidadMedida: true,
    },
    saleFlags: NO_SALE_FLAGS,
    modules: { inventory: true },
    validations: { requireExpiryDate: false },
  },

  RESTAURANT: {
    label: "Restaurante",
    description: "Restaurante y comida rápida",
    productFields: NO_EXTRA_FIELDS,
    saleFlags: { ...NO_SALE_FLAGS, showMesa: true, showPropinaSugerida: true },
    modules: { inventory: false },
    validations: { requireExpiryDate: false },
  },

  CLOTHING_STORE: {
    label: "Ropa y Calzado",
    description: "Tienda de ropa y calzado",
    productFields: NO_EXTRA_FIELDS,
    saleFlags: NO_SALE_FLAGS,
    modules: { inventory: true },
    validations: { requireExpiryDate: false },
  },

  HARDWARE_STORE: {
    label: "Ferretería",
    description: "Ferretería y materiales",
    productFields: {
      ...NO_EXTRA_FIELDS,
      codigoBarras: true,
      unidadMedida: true,
    },
    saleFlags: NO_SALE_FLAGS,
    modules: { inventory: true },
    validations: { requireExpiryDate: false },
  },
};

export const BUSINESS_TYPE_OPTIONS = (
  Object.entries(BUSINESS_CONFIGS) as [BusinessType, BusinessConfig][]
).map(([value, cfg]) => ({ value, label: cfg.label }));

// ─── Unidad de Medida ─────────────────────────────────────────────────────────

export type UnidadMedida = "UNIDAD" | "KG" | "LITRO" | "METRO" | "M2" | "CAJA";

export const UNIDAD_MEDIDA_OPTIONS: { value: UnidadMedida; label: string }[] = [
  { value: "UNIDAD", label: "Unidad" },
  { value: "KG",     label: "Kilogramo (kg)" },
  { value: "LITRO",  label: "Litro (L)" },
  { value: "METRO",  label: "Metro (m)" },
  { value: "M2",     label: "Metro cuadrado (m²)" },
  { value: "CAJA",   label: "Caja" },
];

export const UNIDAD_MEDIDA_LABEL: Record<UnidadMedida, string> = {
  UNIDAD: "unid.",
  KG:     "kg",
  LITRO:  "L",
  METRO:  "m",
  M2:     "m²",
  CAJA:   "caja",
};
