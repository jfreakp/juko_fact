import type {
  User,
  Company,
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
  role?: "ADMIN" | "EMISOR";
  companyId?: string;
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
};

export type CreateClientDTO = {
  tipoIdentif: "CEDULA" | "RUC" | "PASAPORTE" | "CONSUMIDOR_FINAL";
  identificacion: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
  telefono?: string;
};

export type CreateProductDTO = {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  precio: number;
  tipoIva: "IVA_0" | "IVA_5" | "IVA_12" | "IVA_15" | "NO_APLICA";
  tipo: "BIEN" | "SERVICIO";
};

export type CreateInvoiceDetailDTO = {
  productId?: string;
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  tipoIva: "IVA_0" | "IVA_5" | "IVA_12" | "IVA_15" | "NO_APLICA";
};

export type CreateInvoiceDTO = {
  clientId: string;
  fechaEmision?: string;
  details: CreateInvoiceDetailDTO[];
  observaciones?: string;
};

// ─── SRI Types ────────────────────────────────────────────────────────────────

export type SRIAmbiente = "PRUEBAS" | "PRODUCCION";

export interface InvoiceForXML {
  invoice: Invoice & {
    company: Company;
    client: Client;
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

export const IVA_RATES: Record<string, number> = {
  IVA_0: 0,
  IVA_5: 5,
  IVA_12: 12,
  IVA_15: 15,
  NO_APLICA: 0,
};

export const IVA_CODIGO_PORCENTAJE: Record<string, string> = {
  IVA_0: "0",
  IVA_5: "5",
  IVA_12: "2",
  IVA_15: "4",
  NO_APLICA: "6",
};

export const TIPO_IDENTIFICACION_CODIGO: Record<string, string> = {
  CEDULA: "05",
  RUC: "04",
  PASAPORTE: "06",
  CONSUMIDOR_FINAL: "07",
};
