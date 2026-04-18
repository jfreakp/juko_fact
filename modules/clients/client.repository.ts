import { prisma } from "@/lib/prisma";
import type { CreateClientDTO } from "@/types";

export const clientRepository = {
  async bulkUpsert(companyId: string, rows: CreateClientDTO[]) {
    const existing = await prisma.client.findMany({
      where: { companyId, identificacion: { in: rows.map((r) => r.identificacion) } },
      select: { identificacion: true },
    });
    const existingSet = new Set(existing.map((e) => e.identificacion));

    const toCreate = rows.filter((r) => !existingSet.has(r.identificacion));
    const toUpdate = rows.filter((r) => existingSet.has(r.identificacion));

    let created = 0;
    if (toCreate.length > 0) {
      const res = await prisma.client.createMany({
        data: toCreate.map((r) => ({ companyId, ...r })),
      });
      created = res.count;
    }

    const CHUNK = 100;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const chunk = toUpdate.slice(i, i + CHUNK);
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.client.updateMany({
            where: { companyId, identificacion: r.identificacion },
            data: {
              tipoIdentif: r.tipoIdentif,
              razonSocial: r.razonSocial,
              direccion: r.direccion,
              email: r.email,
              telefono: r.telefono,
              active: true,
            },
          })
        )
      );
    }

    return { created, updated: toUpdate.length };
  },

  async findAll(companyId: string, search?: string) {
    return prisma.client.findMany({
      where: {
        companyId,
        active: true,
        ...(search
          ? {
              OR: [
                { razonSocial: { contains: search, mode: "insensitive" } },
                { identificacion: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { razonSocial: "asc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.client.findFirst({ where: { id, companyId } });
  },

  async findByIdentificacion(companyId: string, identificacion: string) {
    return prisma.client.findUnique({
      where: { companyId_identificacion: { companyId, identificacion } },
    });
  },

  async create(companyId: string, data: CreateClientDTO) {
    return prisma.client.create({ data: { companyId, ...data } });
  },

  async update(id: string, companyId: string, data: Partial<CreateClientDTO>) {
    return prisma.client.updateMany({
      where: { id, companyId },
      data,
    });
  },

  async softDelete(id: string, companyId: string) {
    return prisma.client.updateMany({
      where: { id, companyId },
      data: { active: false },
    });
  },
};
