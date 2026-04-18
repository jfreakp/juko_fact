import * as XLSX from "xlsx";
import { clientRepository } from "./client.repository";
import type { CreateClientDTO } from "@/types";

const VALID_TIPOS = ["CEDULA", "RUC", "PASAPORTE", "CONSUMIDOR_FINAL"] as const;
type TipoIdentif = (typeof VALID_TIPOS)[number];

function normalizeTipo(raw: string | undefined): TipoIdentif | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if ((VALID_TIPOS as readonly string[]).includes(upper)) return upper as TipoIdentif;
  return null;
}

function normalizeEmail(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim();
  return clean.includes("@") ? clean : undefined;
}

export function parseClientesXlsx(buffer: Buffer): {
  rows: CreateClientDTO[];
  errors: { row: number; message: string }[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  const rows: CreateClientDTO[] = [];
  const errors: { row: number; message: string }[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const tipoRaw = String(r[0] ?? "").trim();
    const identificacion = String(r[1] ?? "").trim();
    const razonSocial = String(r[2] ?? "").trim();
    const direccion = String(r[4] ?? "").trim() || undefined;
    const telefono = String(r[5] ?? "").trim() || undefined;
    const email = normalizeEmail(String(r[7] ?? ""));

    if (!identificacion && !razonSocial) continue; // fila vacía

    const tipoIdentif = normalizeTipo(tipoRaw);
    if (!tipoIdentif) {
      errors.push({ row: i + 1, message: `Fila ${i + 1}: tipo de identificación inválido "${tipoRaw}"` });
      continue;
    }
    if (!identificacion) {
      errors.push({ row: i + 1, message: `Fila ${i + 1}: identificación vacía` });
      continue;
    }
    if (!razonSocial) {
      errors.push({ row: i + 1, message: `Fila ${i + 1}: razón social vacía` });
      continue;
    }

    rows.push({ tipoIdentif, identificacion, razonSocial, direccion, telefono, email });
  }

  return { rows, errors };
}

export const clientService = {
  async importFromExcel(companyId: string, buffer: Buffer) {
    const { rows, errors } = parseClientesXlsx(buffer);
    if (rows.length === 0) {
      return { created: 0, updated: 0, errors };
    }
    const { created, updated } = await clientRepository.bulkUpsert(companyId, rows);
    return { created, updated, errors };
  },

  async getAll(companyId: string, search?: string) {
    return clientRepository.findAll(companyId, search);
  },

  async getById(id: string, companyId: string) {
    const client = await clientRepository.findById(id, companyId);
    if (!client) throw new Error("Cliente no encontrado");
    return client;
  },

  async create(companyId: string, dto: CreateClientDTO) {
    const existing = await clientRepository.findByIdentificacion(
      companyId,
      dto.identificacion
    );
    if (existing) {
      throw new Error(
        `Ya existe un cliente con identificación ${dto.identificacion}`
      );
    }
    return clientRepository.create(companyId, dto);
  },

  async update(id: string, companyId: string, dto: Partial<CreateClientDTO>) {
    await clientService.getById(id, companyId);
    return clientRepository.update(id, companyId, dto);
  },

  async delete(id: string, companyId: string) {
    await clientService.getById(id, companyId);
    return clientRepository.softDelete(id, companyId);
  },
};
