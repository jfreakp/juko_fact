import { prisma } from "@/lib/prisma";
import type { CreateBranchDTO, UpdateBranchDTO } from "@/types";

export const branchRepository = {
  async findAll(companyId: string) {
    return prisma.branch.findMany({
      where: { companyId, active: true },
      include: { _count: { select: { users: true, invoices: true } } },
      orderBy: { nombre: "asc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.branch.findFirst({
      where: { id, companyId },
      include: { _count: { select: { users: true, invoices: true } } },
    });
  },

  async create(companyId: string, dto: CreateBranchDTO) {
    return prisma.branch.create({
      data: { companyId, nombre: dto.nombre, direccion: dto.direccion },
    });
  },

  async update(id: string, companyId: string, dto: UpdateBranchDTO) {
    return prisma.branch.updateMany({
      where: { id, companyId },
      data: dto,
    });
  },

  async delete(id: string, companyId: string) {
    return prisma.branch.updateMany({
      where: { id, companyId },
      data: { active: false },
    });
  },
};
