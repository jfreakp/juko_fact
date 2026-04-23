import type { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface ApplyMovementParams {
  companyId: string;
  branchId: string;
  inventoryProductId: string;
  /** Positivo = entrada, negativo = salida */
  delta: number;
  tipo: StockMovementType;
  costoUnitario: number;
  referencia?: string;
  referenciaId?: string;
  notas?: string;
  userId: string;
  tx: Prisma.TransactionClient;
}

// ─── Validación pre-factura (sin transacción) ─────────────────────────────────

export async function validateStock(
  companyId: string,
  branchId: string,
  items: Array<{ productId: string; cantidad: number }>
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const invProduct = await prisma.inventoryProduct.findUnique({
      where: { productId: item.productId },
      include: {
        stocks: { where: { branchId, companyId } },
        product: { select: { descripcion: true, codigoPrincipal: true } },
      },
    });

    if (!invProduct?.tracksInventory) continue;

    const disponible = invProduct.stocks[0] ? Number(invProduct.stocks[0].cantidad) : 0;
    if (disponible < item.cantidad) {
      errors.push(
        `[${invProduct.product.codigoPrincipal}] ${invProduct.product.descripcion}: ` +
          `disponible ${disponible.toFixed(2)}, solicitado ${item.cantidad}`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─── Motor central (usado dentro de transacciones) ────────────────────────────

export async function applyMovement(params: ApplyMovementParams): Promise<void> {
  const {
    companyId,
    branchId,
    inventoryProductId,
    delta,
    tipo,
    costoUnitario,
    referencia,
    referenciaId,
    notas,
    userId,
    tx,
  } = params;

  // 1. Leer stock actual con FOR UPDATE implícito (Prisma usa SELECT en la tx)
  const existing = await tx.stock.findUnique({
    where: { branchId_inventoryProductId: { branchId, inventoryProductId } },
  });

  const stockActual = existing ? Number(existing.cantidad) : 0;
  const nuevoStock = stockActual + delta;

  if (nuevoStock < 0) {
    throw new Error(
      `Stock insuficiente. Disponible: ${stockActual.toFixed(2)}, solicitado: ${Math.abs(delta).toFixed(2)}`
    );
  }

  // 2. Upsert de stock
  if (existing) {
    await tx.stock.update({
      where: { branchId_inventoryProductId: { branchId, inventoryProductId } },
      data: { cantidad: nuevoStock },
    });
  } else {
    await tx.stock.create({
      data: { companyId, branchId, inventoryProductId, cantidad: nuevoStock },
    });
  }

  // 3. Actualizar costo promedio ponderado sólo en entradas
  if (delta > 0) {
    const invProduct = await tx.inventoryProduct.findUniqueOrThrow({
      where: { id: inventoryProductId },
      select: { costoPromedio: true },
    });
    const costoActual = Number(invProduct.costoPromedio);
    const stockTotal = stockActual + delta;
    const nuevoCosto = stockTotal > 0
      ? (stockActual * costoActual + delta * costoUnitario) / stockTotal
      : costoUnitario;

    await tx.inventoryProduct.update({
      where: { id: inventoryProductId },
      data: { costoPromedio: nuevoCosto },
    });
  }

  // 4. Registrar en kardex
  await tx.stockMovement.create({
    data: {
      companyId,
      branchId,
      inventoryProductId,
      userId,
      tipo,
      cantidad: Math.abs(delta),
      costoUnitario,
      costoTotal: Math.abs(delta) * costoUnitario,
      saldoResultante: nuevoStock,
      referencia,
      referenciaId,
      notas,
    },
  });
}

// ─── Helpers para invoice.service ────────────────────────────────────────────

export async function deductFromInvoice(params: {
  companyId: string;
  branchId: string;
  productId: string;
  cantidad: number;
  referencia: string;
  referenciaId: string;
  userId: string;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  const { productId, tx, ...rest } = params;

  const invProduct = await tx.inventoryProduct.findUnique({
    where: { productId },
    select: { id: true, tracksInventory: true, costoPromedio: true },
  });

  if (!invProduct?.tracksInventory) return;

  await applyMovement({
    ...rest,
    inventoryProductId: invProduct.id,
    delta: -Math.abs(rest.cantidad),
    tipo: "SALIDA",
    costoUnitario: Number(invProduct.costoPromedio),
    tx,
  });
}

export async function revertFromInvoice(params: {
  companyId: string;
  branchId: string;
  productId: string;
  cantidad: number;
  costoUnitario: number;
  referencia: string;
  referenciaId: string;
  userId: string;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  const { productId, tx, ...rest } = params;

  const invProduct = await tx.inventoryProduct.findUnique({
    where: { productId },
    select: { id: true, tracksInventory: true },
  });

  if (!invProduct?.tracksInventory) return;

  await applyMovement({
    ...rest,
    inventoryProductId: invProduct.id,
    delta: Math.abs(rest.cantidad),
    tipo: "ENTRADA",
    referencia: `REV-${rest.referencia}`,
    tx,
  });
}
