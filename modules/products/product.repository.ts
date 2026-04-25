import { prisma } from "@/lib/prisma";
import type { CreateProductDTO } from "@/types";

export const productRepository = {
  async findAll(companyId: string, search?: string, barcode?: string) {
    return prisma.product.findMany({
      where: {
        companyId,
        active: true,
        ...(barcode
          ? { codigoBarras: barcode }
          : search
          ? {
              OR: [
                { descripcion: { contains: search, mode: "insensitive" } },
                { codigoPrincipal: { contains: search, mode: "insensitive" } },
                { codigoBarras: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { descripcion: "asc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.product.findFirst({ where: { id, companyId } });
  },

  async findByCodigo(companyId: string, codigoPrincipal: string) {
    return prisma.product.findUnique({
      where: { companyId_codigoPrincipal: { companyId, codigoPrincipal } },
    });
  },

  async create(companyId: string, data: CreateProductDTO) {
    return prisma.product.create({
      data: {
        companyId,
        ...data,
        precio: data.precio,
        metadata: data.metadata as never,
      },
    });
  },

  async update(id: string, companyId: string, data: Partial<CreateProductDTO>) {
    return prisma.product.updateMany({
      where: { id, companyId },
      data: { ...data, metadata: data.metadata as never },
    });
  },

  async softDelete(id: string, companyId: string) {
    return prisma.product.updateMany({ where: { id, companyId }, data: { active: false } });
  },

  async markFavorite(id: string, companyId: string) {
    return prisma.product.updateMany({ where: { id, companyId }, data: { isFavorite: true } });
  },

  async unmarkFavorite(id: string, companyId: string) {
    return prisma.product.updateMany({ where: { id, companyId }, data: { isFavorite: false } });
  },
};
