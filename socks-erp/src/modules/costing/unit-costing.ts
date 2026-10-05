/**
 * Apparel Unit Costing & Bill of Materials (BOM) Calculation Engine.
 */

export type BillOfMaterialsInput = {
  pairWeightG: number; // e.g. 43.3 grams
  yarnRatePerKg: number; // e.g. $4.50 / kg
  elasticSpandexCostPerDozen?: number; // e.g. $0.35 / dozen
  wasteFactorPercent?: number; // e.g. 4.0%
  knittingLaborOverheadPerDozen?: number; // e.g. $1.20 / dozen
  linkingFinishingCostPerDozen?: number; // e.g. $0.60 / dozen
  packagingCostPerDozen?: number; // e.g. $0.45 / dozen (polybag, hanger, carton)
};

export type UnitCostingBreakdown = {
  pairWeightG: number;
  dozenWeightKg: number;
  grossYarnPerDozenKg: number; // Including scrap/waste
  yarnCostPerDozen: number;
  elasticCostPerDozen: number;
  laborOverheadPerDozen: number;
  finishingCostPerDozen: number;
  packagingCostPerDozen: number;
  totalCostPerDozen: number;
  totalCostPerPair: number;
};

/**
 * Calculates comprehensive standard production unit costing per pair and per dozen.
 *
 * @param bom - BillOfMaterialsInput specifications.
 * @returns UnitCostingBreakdown with granular textile cost components.
 */
export function calculateUnitCost(bom: BillOfMaterialsInput): UnitCostingBreakdown {
  const {
    pairWeightG,
    yarnRatePerKg,
    elasticSpandexCostPerDozen = 0.35,
    wasteFactorPercent = 4.0,
    knittingLaborOverheadPerDozen = 1.2,
    linkingFinishingCostPerDozen = 0.6,
    packagingCostPerDozen = 0.45,
  } = bom;

  // 1 Dozen = 12 pairs. Net yarn weight in kg = (pairWeightG * 12) / 1000
  const netDozenWeightKg = Number(((pairWeightG * 12) / 1000).toFixed(4));

  // Gross yarn accounting for knitting waste allowance (e.g. 4% scrap)
  const wasteMultiplier = 1 + wasteFactorPercent / 100;
  const grossYarnPerDozenKg = Number((netDozenWeightKg * wasteMultiplier).toFixed(4));

  // Raw material yarn cost
  const yarnCostPerDozen = Number((grossYarnPerDozenKg * yarnRatePerKg).toFixed(2));

  // Total cost per dozen
  const totalCostPerDozen = Number(
    (
      yarnCostPerDozen +
      elasticSpandexCostPerDozen +
      knittingLaborOverheadPerDozen +
      linkingFinishingCostPerDozen +
      packagingCostPerDozen
    ).toFixed(2)
  );

  // Total cost per single pair
  const totalCostPerPair = Number((totalCostPerDozen / 12).toFixed(3));

  return {
    pairWeightG,
    dozenWeightKg: netDozenWeightKg,
    grossYarnPerDozenKg,
    yarnCostPerDozen,
    elasticCostPerDozen: elasticSpandexCostPerDozen,
    laborOverheadPerDozen: knittingLaborOverheadPerDozen,
    finishingCostPerDozen: linkingFinishingCostPerDozen,
    packagingCostPerDozen,
    totalCostPerDozen,
    totalCostPerPair,
  };
}
