import { Prisma } from "@prisma/client";
import { db } from "../core/db";
import { audit } from "../core/audit";

/**
 * Standard Stock Movement Transaction Types.
 */
export type MovementType =
  | "OPENING"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUST_IN"
  | "ADJUST_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "PURCHASE"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "PRODUCTION"
  | "SALE"
  | "REVERSAL";

/**
 * Direction vector mapping for stock movements:
 * +1 represents an increment (inflow), -1 represents a decrement (outflow).
 */
export const DIRECTION: Record<MovementType, 1 | -1> = {
  OPENING: 1,
  STOCK_IN: 1,
  ADJUST_IN: 1,
  TRANSFER_IN: 1,
  PURCHASE: 1,
  RETURN_IN: 1,
  PRODUCTION: 1,
  STOCK_OUT: -1,
  ADJUST_OUT: -1,
  TRANSFER_OUT: -1,
  RETURN_OUT: -1,
  SALE: -1,
  REVERSAL: -1,
};

export type MoveInput = {
  type: MovementType;
  qty: number;
  warehouseId: number;
  userId: number;
  materialId?: number;
  productId?: number;
  batchId?: number;
  referenceType?: string;
  referenceId?: number;
  note?: string;
  direction?: 1 | -1; // Specific override for REVERSAL movements
};

/**
 * Applies a single inventory movement and atomically synchronizes the cached running balance.
 * MUST be executed within a database transaction to preserve ledger consistency.
 *
 * @param tx - Prisma transactional client.
 * @param m - Movement input payload.
 * @returns The created StockMovement record.
 * @throws Error if quantity <= 0, item target is ambiguous, or warehouse balance is insufficient.
 */
export async function applyMovement(tx: Prisma.TransactionClient, m: MoveInput) {
  if (!(m.qty > 0)) {
    throw new Error("Quantity must be greater than zero.");
  }
  if (!!m.materialId === !!m.productId) {
    throw new Error("Specify either a raw material (yarn) OR a finished product, not both.");
  }

  const dir = m.type === "REVERSAL" ? m.direction ?? -1 : DIRECTION[m.type];
  const itemKey = m.materialId ? `M:${m.materialId}` : `P:${m.productId}`;
  const where = { itemKey_warehouseId: { itemKey, warehouseId: m.warehouseId } };

  if (dir === 1) {
    // Inbound: increment running balance
    await tx.stockBalance.upsert({
      where,
      update: { qty: { increment: m.qty } },
      create: {
        itemKey,
        materialId: m.materialId,
        productId: m.productId,
        warehouseId: m.warehouseId,
        qty: m.qty,
      },
    });
  } else if (process.env.ALLOW_NEGATIVE_STOCK === "true") {
    // Outbound with negative balance override allowed
    await tx.stockBalance.upsert({
      where,
      update: { qty: { decrement: m.qty } },
      create: {
        itemKey,
        materialId: m.materialId,
        productId: m.productId,
        warehouseId: m.warehouseId,
        qty: -m.qty,
      },
    });
  } else {
    // Outbound with strict atomic non-negative guard
    const updated = await tx.stockBalance.updateMany({
      where: {
        itemKey,
        warehouseId: m.warehouseId,
        qty: { gte: m.qty },
      },
      data: { qty: { decrement: m.qty } },
    });

    if (updated.count === 0) {
      throw new Error(`Insufficient stock in warehouse #${m.warehouseId} for item ${itemKey}.`);
    }
  }

  const row = await tx.stockMovement.create({
    data: {
      type: m.type,
      direction: dir,
      qty: m.qty,
      materialId: m.materialId,
      productId: m.productId,
      batchId: m.batchId,
      warehouseId: m.warehouseId,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      note: m.note,
      createdById: m.userId,
    },
  });

  await audit(tx, {
    userId: m.userId,
    action: `stock.${m.type}`,
    entity: "StockMovement",
    entityId: row.id,
    newValue: row,
  });

  return row;
}

export type TransferInput = {
  userId: number;
  qty: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  materialId?: number;
  productId?: number;
  batchId?: number;
  note?: string;
};

/**
 * Transfers stock between two distinct warehouses as two correlated ledger movements.
 *
 * @param p - Transfer input parameters.
 */
export async function transfer(p: TransferInput) {
  if (p.fromWarehouseId === p.toWarehouseId) {
    throw new Error("Source and destination warehouses must be different.");
  }

  return db.$transaction(async (tx) => {
    const base = {
      userId: p.userId,
      qty: p.qty,
      materialId: p.materialId,
      productId: p.productId,
      batchId: p.batchId,
      note: p.note,
    };

    const outMovement = await applyMovement(tx, {
      ...base,
      type: "TRANSFER_OUT",
      warehouseId: p.fromWarehouseId,
    });

    const inMovement = await applyMovement(tx, {
      ...base,
      type: "TRANSFER_IN",
      warehouseId: p.toWarehouseId,
      referenceType: "TRANSFER_OUT",
      referenceId: outMovement.id,
    });

    return { outMovement, inMovement };
  });
}

/**
 * Executes a standalone stock movement inside an isolated transaction.
 */
export async function move(m: MoveInput) {
  return db.$transaction((tx) => applyMovement(tx, m));
}
