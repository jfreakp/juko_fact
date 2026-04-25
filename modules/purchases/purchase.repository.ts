import { prisma } from "@/lib/prisma";
import { TipoDocumentoCompra } from "@prisma/client";
import { applyMovement } from "@/modules/inventory/stock.service";

export interface PurchaseItemInput {
  productId?: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

export interface CreatePurchaseDTO {
  companyId: string;
  branchId: string;
  userId: string;
  supplierId?: string;
  tipoDocumento?: TipoDocumentoCompra;
  numeroDocumento?: string;
  fechaCompra?: Date;
  notas?: string;
  items: PurchaseItemInput[];
}

export const purchaseRepository = {
  async findAll(
    companyId: string,
    opts?: { from?: Date; to?: Date; supplierId?: string; branchId?: string }
  ) {
    return prisma.purchase.findMany({
      where: {
        companyId,
        ...(opts?.supplierId ? { supplierId: opts.supplierId } : {}),
        ...(opts?.branchId ? { branchId: opts.branchId } : {}),
        ...(opts?.from || opts?.to
          ? {
              fechaCompra: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, nombre: true, ruc: true } },
        branch: { select: { id: true, nombre: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { fechaCompra: "desc" },
    });
  },

  async findById(id: string, companyId: string) {
    return prisma.purchase.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        branch: { select: { id: true, nombre: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                codigoPrincipal: true,
                descripcion: true,
                unidadMedida: true,
              },
            },
          },
        },
      },
    });
  },

  async create(data: CreatePurchaseDTO) {
    const { companyId, branchId, userId, supplierId, tipoDocumento, numeroDocumento, fechaCompra, notas, items } = data;

    // Compute totals
    let subtotal = 0;
    for (const it of items) {
      subtotal += it.cantidad * it.costoUnitario;
    }
    const total = subtotal; // Purchases record cost without IVA by default; caller can add it if needed

    return prisma.$transaction(async (tx) => {
      // Create purchase header
      const purchase = await tx.purchase.create({
        data: {
          companyId,
          branchId,
          userId,
          supplierId: supplierId ?? null,
          tipoDocumento: tipoDocumento ?? "FACTURA",
          numeroDocumento: numeroDocumento ?? null,
          fechaCompra: fechaCompra ?? new Date(),
          notas: notas ?? null,
          subtotal,
          iva: 0,
          total,
          items: {
            create: items.map((it) => ({
              productId: it.productId ?? null,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              costoUnitario: it.costoUnitario,
              costoTotal: it.cantidad * it.costoUnitario,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Apply stock movements for items linked to a product
      for (const item of purchase.items) {
        if (!item.productId) continue;

        const invProduct = await tx.inventoryProduct.findUnique({
          where: { productId: item.productId },
        });

        if (!invProduct?.tracksInventory) continue;

        await applyMovement({
          companyId,
          branchId,
          inventoryProductId: invProduct.id,
          delta: Number(item.cantidad),
          tipo: "ENTRADA",
          costoUnitario: Number(item.costoUnitario),
          referencia: "COMPRA",
          referenciaId: purchase.id,
          notas: `Compra ${purchase.numeroDocumento ?? purchase.id}`,
          userId,
          tx,
        });
      }

      return purchase;
    });
  },
};
