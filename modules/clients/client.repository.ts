import { prisma } from "@/lib/prisma";
import type { CreateClientDTO } from "@/types";

export const clientRepository = {
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
