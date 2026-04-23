import { prisma } from "@/lib/prisma";

export const inventoryRepository = {
  async findStock(companyId: string, branchId?: string) {
    return prisma.stock.findMany({
      where: {
        companyId,
        ...(branchId ? { branchId } : {}),
        inventoryProduct: { tracksInventory: true },
      },
      include: {
        inventoryProduct: {
          include: {
            product: {
              select: {
                id: true,
                codigoPrincipal: true,
                codigoAuxiliar: true,
                descripcion: true,
                precio: true,
                tipo: true,
              },
            },
          },
        },
        branch: { select: { id: true, nombre: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findKardex(
    companyId: string,
    opts: {
      inventoryProductId?: string;
      branchId?: string;
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    }
  ) {
    const { inventoryProductId, branchId, from, to, page, limit } = opts;
    const where = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(inventoryProductId ? { inventoryProductId } : {}),
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          inventoryProduct: {
            include: { product: { select: { codigoPrincipal: true, descripcion: true } } },
          },
          branch: { select: { id: true, nombre: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async findAlerts(companyId: string, branchId?: string) {
    return prisma.stock.findMany({
      where: {
        companyId,
        ...(branchId ? { branchId } : {}),
        inventoryProduct: { tracksInventory: true },
      },
      include: {
        inventoryProduct: {
          include: { product: { select: { codigoPrincipal: true, descripcion: true } } },
        },
        branch: { select: { id: true, nombre: true } },
      },
    });
  },

  async findInventoryProductByProductId(productId: string) {
    return prisma.inventoryProduct.findUnique({ where: { productId } });
  },

  async findAllInventoryProducts(companyId: string) {
    return prisma.inventoryProduct.findMany({
      where: { companyId, tracksInventory: true },
      include: {
        product: { select: { id: true, codigoPrincipal: true, descripcion: true } },
      },
      orderBy: { product: { descripcion: "asc" } },
    });
  },

  async upsertInventoryProduct(
    productId: string,
    companyId: string,
    data: { tracksInventory?: boolean; costoPromedio?: number; stockMinimo?: number }
  ) {
    return prisma.inventoryProduct.upsert({
      where: { productId },
      create: { productId, companyId, ...data },
      update: data,
    });
  },

  async findTransfers(companyId: string, branchId?: string) {
    return prisma.stockTransfer.findMany({
      where: {
        companyId,
        ...(branchId ? { fromBranchId: branchId } : {}),
      },
      include: {
        fromBranch: { select: { id: true, nombre: true } },
        toBranch: { select: { id: true, nombre: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryProduct: {
              include: { product: { select: { codigoPrincipal: true, descripcion: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
