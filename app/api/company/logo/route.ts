import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth, apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file) return apiError("Archivo de logo requerido");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError("Formato no permitido. Use JPG, PNG, WebP o SVG");
    }
    if (file.size > MAX_SIZE_BYTES) {
      return apiError("El archivo excede el límite de 2 MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const fileName = `logo-${auth.payload.companyId}.${ext}`;

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, fileName), buffer);

    const logoUrl = `/uploads/${fileName}`;

    await prisma.company.update({
      where: { id: auth.payload.companyId },
      data: { logoUrl },
    });

    return apiSuccess({ logoUrl });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al subir logo");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;
  if (!auth.payload.companyId) return apiError("Sin empresa asignada", 400);

  try {
    await prisma.company.update({
      where: { id: auth.payload.companyId },
      data: { logoUrl: null },
    });
    return apiSuccess({ logoUrl: null });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error al eliminar logo");
  }
}
