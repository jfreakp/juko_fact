export const dynamic = "force-dynamic";

import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import { clientService } from "@/modules/clients/client.service";
import { requireRole, apiSuccess, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const headers = [
    "Tipo Id.",
    "CI/RUC",
    "Razón Social",
    "Nombre Comercial",
    "Dirección",
    "Teléfono 1",
    "Teléfono 2",
    "Email",
    "Grupo Cliente",
  ];

  const example = [
    "CEDULA",
    "0999999999",
    "APELLIDO NOMBRE COMPLETO",
    "NOMBRE COMERCIAL",
    "Av. Principal 123",
    "0999999999",
    "",
    "correo@ejemplo.com",
    "FINALES",
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  // Column widths
  ws["!cols"] = [
    { wch: 14 }, { wch: 16 }, { wch: 36 }, { wch: 30 },
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_clientes.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "ADMIN");
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return apiError("Archivo requerido", 400);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await clientService.importFromExcel(auth.payload.companyId, buffer);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al importar", 500);
  }
}
