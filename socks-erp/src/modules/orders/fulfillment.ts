/**
 * Order Fulfillment and Finished Goods Packaging Calculation Engine.
 */

export const STANDARD_PAIRS_PER_CARTON = 144; // 12 Dozen per master export carton
export const STANDARD_CARTONS_PER_PALLET = 30; // 30 Cartons per standard export pallet

export type PackingCalculation = {
  orderedPairs: number;
  orderedDozens: number;
  fullCartons: number;
  loosePairs: number;
  totalCartonsNeeded: number;
  palletsNeeded: number;
  estimatedNetWeightKg: number;
  estimatedGrossWeightKg: number; // Including carton tare weight
};

/**
 * Calculates export packing requirements, carton quantities, and pallet dimensions.
 *
 * @param pairs - Total finished goods pairs to pack and dispatch.
 * @param dozenWeightKg - Weight in kg per dozen (default 0.52 kg).
 * @param cartonTareKg - Tare weight per empty master carton box (default 1.2 kg).
 * @returns PackingCalculation detailing carton and pallet distribution.
 */
export function calculatePackagingRequirements(
  pairs: number,
  dozenWeightKg = 0.52,
  cartonTareKg = 1.2
): PackingCalculation {
  const orderedPairs = Math.max(0, pairs);
  const orderedDozens = Number((orderedPairs / 12).toFixed(2));

  const fullCartons = Math.floor(orderedPairs / STANDARD_PAIRS_PER_CARTON);
  const loosePairs = orderedPairs % STANDARD_PAIRS_PER_CARTON;
  const totalCartonsNeeded = fullCartons + (loosePairs > 0 ? 1 : 0);
  const palletsNeeded = Math.ceil(totalCartonsNeeded / STANDARD_CARTONS_PER_PALLET);

  const estimatedNetWeightKg = Number(((orderedPairs / 12) * dozenWeightKg).toFixed(2));
  const estimatedGrossWeightKg = Number(
    (estimatedNetWeightKg + totalCartonsNeeded * cartonTareKg).toFixed(2)
  );

  return {
    orderedPairs,
    orderedDozens,
    fullCartons,
    loosePairs,
    totalCartonsNeeded,
    palletsNeeded,
    estimatedNetWeightKg,
    estimatedGrossWeightKg,
  };
}
