import { Prisma } from "@prisma/client";
import { applyMovement } from "./stock";

/**
 * Strategy for inventory batch depletion.
 */
export type DepletionStrategy = "FIFO" | "LIFO" | "SPECIFIC_BATCH";

export type DepleteBatchRequest = {
  materialId: number;
  warehouseId: number;
  requiredQty: number; // in kg
  userId: number;
  strategy?: DepletionStrategy;
  targetBatchId?: number; // Required if strategy is SPECIFIC_BATCH
  referenceType?: string;
  referenceId?: number;
  note?: string;
};

export type DepletionAllocation = {
  batchId: number;
  lotNo: string;
  allocatedQty: number;
  unitRate: number;
  subtotalCost: number;
};

export type DepletionResult = {
  materialId: number;
  totalDepleted: number;
  remainingRequired: number;
  allocations: DepletionAllocation[];
  movements: any[];
};

/**
 * Executes batch-tracked inventory depletion for raw materials (yarn) using FIFO or LIFO.
 * Automatically traverses material batches, allocates available quantities, records
 * individual movements with batch linkages, and computes depleted cost roll-ups.
 *
 * @param tx - Prisma Transaction Client.
 * @param req - DepleteBatchRequest parameters.
 * @returns DepletionResult detailing allocations across lots and recorded movements.
 * @throws Error if insufficient batch stock exists or invalid parameters are provided.
 */
export async function depleteBatchInventory(
  tx: Prisma.TransactionClient,
  req: DepleteBatchRequest
): Promise<DepletionResult> {
  const { materialId, warehouseId, requiredQty, userId, strategy = "FIFO" } = req;

  if (requiredQty <= 0) {
    throw new Error("Depletion quantity must be strictly positive.");
  }

  // Fetch candidate batches for this material
  const batches = await tx.materialBatch.findMany({
    where: {
      materialId,
      ...(strategy === "SPECIFIC_BATCH" && req.targetBatchId ? { id: req.targetBatchId } : {}),
    },
    orderBy: {
      purchaseDate: strategy === "LIFO" ? "desc" : "asc",
    },
    include: {
      movements: {
        where: { warehouseId },
        select: { qty: true, direction: true },
      },
    },
  });

  let remaining = requiredQty;
  const allocations: DepletionAllocation[] = [];
  const movements: any[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    // Calculate current net available stock in this batch for the specified warehouse
    const batchBalance = batch.movements.reduce(
      (acc, m) => acc + Number(m.qty) * m.direction,
      0
    );

    if (batchBalance <= 0) continue;

    const allocQty = Math.min(batchBalance, remaining);
    const rate = Number(batch.rate ?? 0);

    allocations.push({
      batchId: batch.id,
      lotNo: batch.lotNo,
      allocatedQty: allocQty,
      unitRate: rate,
      subtotalCost: Number((allocQty * rate).toFixed(2)),
    });

    const mov = await applyMovement(tx, {
      type: "PRODUCTION",
      qty: allocQty,
      materialId,
      batchId: batch.id,
      warehouseId,
      userId,
      referenceType: req.referenceType ?? "DEPLETION_RUN",
      referenceId: req.referenceId,
      note: req.note ?? `Depleted from Lot #${batch.lotNo} via ${strategy}`,
    });

    movements.push(mov);
    remaining -= allocQty;
  }

  if (remaining > 0 && process.env.ALLOW_NEGATIVE_STOCK !== "true") {
    throw new Error(
      `Insufficient lot-tracked inventory for material #${materialId}. Shortfall: ${remaining.toFixed(
        2
      )} kg.`
    );
  }

  return {
    materialId,
    totalDepleted: Number((requiredQty - Math.max(0, remaining)).toFixed(3)),
    remainingRequired: Math.max(0, remaining),
    allocations,
    movements,
  };
}
