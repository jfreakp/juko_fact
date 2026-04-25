import { prisma } from "@/lib/prisma";

export interface CreateSupplierDTO {
  companyId: string;
  ruc?: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export interface UpdateSupplierDTO {
  ruc?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  active?: boolean;
}

export const supplierRepository = {
  async findAll(companyId: string, search?: string) {
    return prisma.supplier.findMany({
      where: {
        companyId,
        active: true,
        ...(search
          ? {
              OR: [
                { nombre: { contains: search, mode: "insensitive" } },
                { ruc: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: "asc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.supplier.findFirst({ where: { id, companyId } });
  },

  async create(data: CreateSupplierDTO) {
    return prisma.supplier.create({ data });
  },

  async update(id: string, companyId: string, data: UpdateSupplierDTO) {
    return prisma.supplier.updateMany({ where: { id, companyId }, data });
  },

  async delete(id: string, companyId: string) {
    // Soft delete
    return prisma.supplier.updateMany({
      where: { id, companyId },
      data: { active: false },
    });
  },
};
