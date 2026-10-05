import { Prisma } from "@prisma/client";

export type ValuationSummary = {
  totalRawMaterialKg: number;
  totalFinishedPairs: number;
  totalFinishedDozens: number;
  estimatedRawValuation: number;
  estimatedFinishedValuation: number;
  totalAssetValue: number;
};

/**
 * Calculates current total inventory valuation across raw materials and finished goods.
 *
 * @param prisma - Prisma client instance.
 * @returns ValuationSummary containing aggregate quantities and standard currency valuation.
 */
export async function calculateInventoryValuation(
  prisma: Prisma.TransactionClient | any
): Promise<ValuationSummary> {
  const [materials, products, balances] = await Promise.all([
    prisma.material.findMany({ select: { id: true, code: true, name: true, batches: { select: { rate: true } } } }),
    prisma.product.findMany({ select: { id: true, code: true, stdCost: true, sellingPrice: true } }),
    prisma.stockBalance.findMany(),
  ]);

  let totalRawMaterialKg = 0;
  let estimatedRawValuation = 0;

  for (const mat of materials) {
    const qty = balances
      .filter((b: any) => b.materialId === mat.id)
      .reduce((acc: number, b: any) => acc + Number(b.qty), 0);

    // Compute average lot purchase rate or fallback to standard baseline
    const rates = mat.batches.map((b: any) => Number(b.rate ?? 0)).filter((r: number) => r > 0);
    const avgRate = rates.length ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : 4.5; // $4.50/kg standard cotton baseline

    totalRawMaterialKg += qty;
    estimatedRawValuation += qty * avgRate;
  }

  let totalFinishedPairs = 0;
  let estimatedFinishedValuation = 0;

  for (const prod of products) {
    const qty = balances
      .filter((b: any) => b.productId === prod.id)
      .reduce((acc: number, b: any) => acc + Number(b.qty), 0);

    const stdCostPerPair = Number(prod.stdCost ?? 0) || 0.65; // $0.65/pair standard cost fallback
    totalFinishedPairs += qty;
    estimatedFinishedValuation += qty * stdCostPerPair;
  }

  return {
    totalRawMaterialKg: Number(totalRawMaterialKg.toFixed(2)),
    totalFinishedPairs: Math.round(totalFinishedPairs),
    totalFinishedDozens: Number((totalFinishedPairs / 12).toFixed(1)),
    estimatedRawValuation: Number(estimatedRawValuation.toFixed(2)),
    estimatedFinishedValuation: Number(estimatedFinishedValuation.toFixed(2)),
    totalAssetValue: Number((estimatedRawValuation + estimatedFinishedValuation).toFixed(2)),
  };
}
