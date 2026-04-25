import { prisma } from "@/lib/prisma";
import { inventoryRepository } from "./inventory.repository";
import { applyMovement, validateStock } from "./stock.service";
import type { StockMovementType } from "@prisma/client";

export { validateStock };

export const inventoryService = {
  // ── Stock ──────────────────────────────────────────────────────────────────

  async getStock(companyId: string, branchId?: string) {
    return inventoryRepository.findStock(companyId, branchId);
  },

  // ── Alertas ────────────────────────────────────────────────────────────────

  async getAlerts(companyId: string, branchId?: string) {
    const all = await inventoryRepository.findAlerts(companyId, branchId);
    return all.filter((s) => Number(s.cantidad) <= Number(s.stockMinimo));
  },

  // ── Kardex ─────────────────────────────────────────────────────────────────

  async getKardex(
    companyId: string,
    opts: {
      productId?: string;
      branchId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;

    // Traducir productId → inventoryProductId
    let inventoryProductId: string | undefined;
    if (opts.productId) {
      const inv = await inventoryRepository.findInventoryProductByProductId(opts.productId);
      if (inv) inventoryProductId = inv.id;
    }

    return inventoryRepository.findKardex(companyId, {
      inventoryProductId,
      branchId: opts.branchId,
      from: opts.from,
      to: opts.to,
      page,
      limit,
    });
  },

  // ── Configurar inventario en producto ──────────────────────────────────────

  async configureProduct(
    productId: string,
    companyId: string,
    data: { tracksInventory?: boolean; costoPromedio?: number; stockMinimo?: number }
  ) {
    return inventoryRepository.upsertInventoryProduct(productId, companyId, data);
  },

  async getInventoryProducts(companyId: string) {
    return inventoryRepository.findAllInventoryProducts(companyId);
  },

  async getInventoryProductConfig(productId: string) {
    return inventoryRepository.findInventoryProductByProductId(productId);
  },

  // ── Ajuste manual ──────────────────────────────────────────────────────────

  async createAdjustment(params: {
    companyId: string;
    branchId: string;
    productId: string;
    cantidad: number;       // positivo = entrada, negativo = salida
    costoUnitario: number;
    notas?: string;
    userId: string;
  }) {
    const { productId, cantidad, costoUnitario, notas, companyId, branchId, userId } = params;

    // Auto-configura el producto en inventario si no existe aún
    let invProduct = await inventoryRepository.findInventoryProductByProductId(productId);
    if (!invProduct || !invProduct.tracksInventory) {
      invProduct = await inventoryRepository.upsertInventoryProduct(productId, companyId, {
        tracksInventory: true,
        costoPromedio: costoUnitario,
      });
    }

    const tipo: StockMovementType = cantidad >= 0 ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO";

    return prisma.$transaction(async (tx) => {
      await applyMovement({
        companyId,
        branchId,
        inventoryProductId: invProduct.id,
        delta: cantidad,
        tipo,
        costoUnitario,
        referencia: "AJUSTE-MANUAL",
        notas,
        userId,
        tx,
      });
    });
  },

  // ── Transferencia entre sucursales ─────────────────────────────────────────

  async createTransfer(params: {
    companyId: string;
    fromBranchId: string;
    toBranchId: string;
    items: Array<{ productId: string; cantidad: number; costoUnitario: number }>;
    notas?: string;
    userId: string;
  }) {
    const { companyId, fromBranchId, toBranchId, items, notas, userId } = params;

    if (fromBranchId === toBranchId) {
      throw new Error("Origen y destino deben ser sucursales distintas");
    }

    // Resolver inventoryProductId para todos los items antes de la transacción
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        const inv = await inventoryRepository.findInventoryProductByProductId(item.productId);
        if (!inv) throw new Error(`Producto ${item.productId} no tiene inventario configurado`);
        if (!inv.tracksInventory) throw new Error(`Producto ${item.productId} no maneja inventario`);
        return { ...item, inventoryProductId: inv.id };
      })
    );

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          companyId,
          fromBranchId,
          toBranchId,
          userId,
          notas,
          status: "COMPLETADA",
          items: {
            create: resolvedItems.map((item) => ({
              inventoryProductId: item.inventoryProductId,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario,
            })),
          },
        },
      });

      for (const item of resolvedItems) {
        // Salida de sucursal origen
        await applyMovement({
          companyId,
          branchId: fromBranchId,
          inventoryProductId: item.inventoryProductId,
          delta: -item.cantidad,
          tipo: "TRANSFERENCIA_OUT",
          costoUnitario: item.costoUnitario,
          referencia: `TRF-${transfer.id.slice(-8)}`,
          referenciaId: transfer.id,
          userId,
          tx,
        });

        // Entrada en sucursal destino
        await applyMovement({
          companyId,
          branchId: toBranchId,
          inventoryProductId: item.inventoryProductId,
          delta: item.cantidad,
          tipo: "TRANSFERENCIA_IN",
          costoUnitario: item.costoUnitario,
          referencia: `TRF-${transfer.id.slice(-8)}`,
          referenciaId: transfer.id,
          userId,
          tx,
        });
      }

      return transfer;
    });
  },

  // ── Historial de transferencias ────────────────────────────────────────────

  async getTransfers(companyId: string, branchId?: string) {
    return inventoryRepository.findTransfers(companyId, branchId);
  },
};
