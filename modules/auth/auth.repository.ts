import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByIdWithCompany(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  },

  async create(data: {
    email: string;
    name: string;
    password: string;
    role?: "ADMIN" | "EMISOR";
    companyId?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });
  },
};
