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

/**
 * D-03: Corregido N+1. Antes ejecutaba una query por cada item.
 * Ahora hace un findMany batch para todos los productos a la vez.
 */
export async function validateStock(
  companyId: string,
  branchId: string,
  items: Array<{ productId: string; cantidad: number }>
): Promise<{ ok: boolean; errors: string[] }> {
  if (items.length === 0) return { ok: true, errors: [] };

  const productIds = items.map((i) => i.productId);

  // Una sola query para todos los productos del lote
  const invProducts = await prisma.inventoryProduct.findMany({
    where: { productId: { in: productIds } },
    include: {
      stocks: { where: { branchId, companyId } },
      product: { select: { descripcion: true, codigoPrincipal: true } },
    },
  });

  // Indexar por productId para lookup O(1)
  const invMap = new Map(invProducts.map((ip) => [ip.productId, ip]));

  const errors: string[] = [];

  for (const item of items) {
    const invProduct = invMap.get(item.productId);
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

  // 1. Leer stock actual
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
    // Al crear el registro Stock, hereda stockMinimo global del InventoryProduct
    const invProductForMin = await tx.inventoryProduct.findUnique({
      where: { id: inventoryProductId },
      select: { stockMinimo: true },
    });
    await tx.stock.create({
      data: {
        companyId,
        branchId,
        inventoryProductId,
        cantidad: nuevoStock,
        stockMinimo: invProductForMin?.stockMinimo ?? 0,
      },
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
    const nuevoCosto =
      stockTotal > 0
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

/**
 * D-02: Corregido costoUnitario en reversión de factura.
 * Antes usaba `detail.precioUnitario` (precio de VENTA), lo que corrompía el
 * costo promedio ponderado al recalcularlo con un valor incorrecto.
 * Ahora usa el `costoPromedio` actual del InventoryProduct (precio de COSTO).
 */
export async function revertFromInvoice(params: {
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

  // D-02: Usar costoPromedio (costo real) en lugar del precio de venta.
  const costoUnitario = Number(invProduct.costoPromedio);

  await applyMovement({
    ...rest,
    inventoryProductId: invProduct.id,
    delta: Math.abs(rest.cantidad),
    tipo: "ENTRADA",
    costoUnitario,
    referencia: `REV-${rest.referencia}`,
    tx,
  });
}
