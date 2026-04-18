import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export const authRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { branch: { select: { id: true } } },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByIdWithCompany(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        company: true,
        branch: { select: { id: true, nombre: true } },
      },
    });
  },

  async create(data: {
    email: string;
    name: string;
    password: string;
    role?: "ADMIN" | "EMPLOYED";
    companyId?: string;
    branchId?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });
  },
};
