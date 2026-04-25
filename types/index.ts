import type {
  User,
  Company,
  Branch,
  Client,
  Product,
  Invoice,
  InvoiceDetail,
  Certificate,
  SRIResponse,
} from "@prisma/client";

// ─── Re-exports ──────────────────────────────────────────────────────────────
export type {
  User,
  Company,
  Branch,
  Client,
  Product,
  Invoice,
  InvoiceDetail,
  Certificate,
  SRIResponse,
};

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type LoginDTO = {
  email: string;
  password: string;
};

export type CreateUserDTO = {
  email: string;
  name: string;
  password: string;
  role?: "ADMIN" | "EMPLOYED";
  companyId?: string;
  branchId?: string;
};

export type UpdateUserDTO = {
  name?: string;
  email?: string;
  role?: "ADMIN" | "EMPLOYED";
  branchId?: string | null;
  active?: boolean;
  password?: string;
};

export type CreateBranchDTO = {
  nombre: string;
  direccion?: string;
};

export type UpdateBranchDTO = {
  nombre?: string;
  direccion?: string;
  active?: boolean;
};

export type UpdateCompanyDTO = {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  dirMatriz?: string;
  estab?: string;
  ptoEmi?: string;
  contribuyenteEsp?: string;
  obligadoContab?: boolean;
  ambiente?: "PRUEBAS" | "PRODUCCION";
  tipoEmision?: "NORMAL" | "INDISPONIBILIDAD";
  logoUrl?: string | null;
  secuencialInicio?: number;
  businessType?:
    | "GENERAL"
    | "PHARMACY"
    | "LIQUOR_STORE"
    | "GROCERY"
    | "RESTAURANT"
    | "CLOTHING_STORE"
    | "HARDWARE_STORE";
};

export type CreateClientDTO = {
  tipoIdentif: "CEDULA" | "RUC" | "PASAPORTE" | "CONSUMIDOR_FINAL";
  identificacion: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
  telefono?: string;
};

// Extra per-business-type fields stored as JSON in the metadata column.
export type ProductMetadata = {
  // Pharmacy / Grocery
  lote?: string;
  fechaVencimiento?: string; // ISO date
  // Pharmacy
  registroSanitario?: string;
  requiereReceta?: boolean;
  principioActivo?: string;
  // Liquor
  gradosAlcohol?: number;
  volumenMl?: number;
  paisOrigen?: string;
};

export type CreateProductDTO = {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  precio: number;
  tipoIva: "IVA_0" | "IVA_5" | "IVA_STANDARD" | "NO_APLICA";
  tipo: "BIEN" | "SERVICIO";
  codigoBarras?: string;
  unidadMedida?: "UNIDAD" | "KG" | "LITRO" | "METRO" | "M2" | "CAJA";
  metadata?: ProductMetadata;
};

export type CreateInvoiceDetailDTO = {
  productId?: string;
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  tipoIva: "IVA_0" | "IVA_5" | "IVA_STANDARD" | "NO_APLICA";
};

export type CreateInvoiceDTO = {
  clientId: string;
  fechaEmision?: string;
  details: CreateInvoiceDetailDTO[];
  observaciones?: string;
  formaPago?: string;
  montoPagado?: number;
  vuelto?: number;
};

// ─── SRI Types ────────────────────────────────────────────────────────────────

export type SRIAmbiente = "PRUEBAS" | "PRODUCCION";

export interface InvoiceForXML {
  invoice: Invoice & {
    company: Company;
    client: Client;
    branch?: Branch | null; // F-05: Dirección de sucursal emisora
    details: (InvoiceDetail & { product?: Product | null })[];
  };
}

export interface XAdESSignatureConfig {
  certificateData: Buffer;
  certificatePassword: string;
  xmlContent: string;
}

export interface SRIReceptionResponse {
  estado: string;
  comprobantes?: {
    comprobante: {
      claveAcceso: string;
      mensajes: {
        mensaje: {
          identificador: string;
          mensaje: string;
          tipo: string;
          informacionAdicional?: string;
        }[];
      };
    };
  };
}

export interface SRIAuthorizationResponse {
  numeroComprobantes: string;
  autorizaciones?: {
    autorizacion: {
      estado: string;
      numeroAutorizacion: string;
      fechaAutorizacion: string;
      ambiente: string;
      comprobante: string;
      mensajes?: {
        mensaje: {
          identificador: string;
          mensaje: string;
          tipo: string;
          informacionAdicional?: string;
        }[];
      };
    };
  };
}

// ─── IVA helpers ─────────────────────────────────────────────────────────────

const _IVA_RATE = Number(process.env.NEXT_PUBLIC_IVA_RATE ?? 15);

// Mapea el porcentaje de IVA al código SRI (Tabla 17).
function _sriCode(rate: number): string {
  const map: Record<number, string> = { 0: "0", 5: "5", 12: "2", 14: "3", 15: "4" };
  return map[rate] ?? "4";
}

export const IVA_RATES: Record<string, number> = {
  IVA_0: 0,
  IVA_5: 5,
  IVA_STANDARD: _IVA_RATE,
  NO_APLICA: 0,
};

export const IVA_CODIGO_PORCENTAJE: Record<string, string> = {
  IVA_0: "0",
  IVA_5: "5",
  IVA_STANDARD: _sriCode(_IVA_RATE),
  NO_APLICA: "6",
};

export const TIPO_IDENTIFICACION_CODIGO: Record<string, string> = {
  CEDULA: "05",
  RUC: "04",
  PASAPORTE: "06",
  CONSUMIDOR_FINAL: "07",
};
