import { prisma } from "@/lib/prisma";
import type { CreateUserDTO, UpdateUserDTO } from "@/types";

export const userRepository = {
  async findAll(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        branchId: true,
        branch: { select: { id: true, nombre: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        branchId: true,
        branch: { select: { id: true, nombre: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  },

  async create(companyId: string, data: Omit<CreateUserDTO, "companyId">) {
    return prisma.user.create({
      data: {
        ...data,
        companyId,
        email: data.email.toLowerCase().trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        branchId: true,
        createdAt: true,
      },
    });
  },

  async update(id: string, companyId: string, data: UpdateUserDTO) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data,
    });
  },

  async delete(id: string, companyId: string) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data: { active: false },
    });
  },
};
