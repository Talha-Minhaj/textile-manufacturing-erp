export type ShiftType = "DAY_12H" | "NIGHT_12H" | "DAY_10H" | "NIGHT_10H";

export type ShiftCalculationInput = {
  dozenA: number; // Category A: Export Grade First Quality (dozen)
  dozenB: number; // Category B: Factory Seconds / Minor Defect (dozen)
  targetPerHour: number;
  shiftHours: number;
};

export type ShiftCalculationResult = {
  totalDozen: number;
  totalPairs: number;
  expectedDozen: number;
  efficiency: number; // in percentage (0-100)
  defectRate: number; // in percentage (0-100)
  gradeARatio: number; // in percentage (0-100)
};

/**
 * Computes shift output metrics, dual-grade sorting totals, efficiency, and defect rates.
 *
 * @param input - Shift output dozens and target velocity.
 * @returns ShiftCalculationResult with standard apparel conversions (1 dozen = 12 pairs).
 */
export function calculateShiftMetrics(input: ShiftCalculationInput): ShiftCalculationResult {
  const dozenA = Math.max(0, input.dozenA);
  const dozenB = Math.max(0, input.dozenB);
  const totalDozen = dozenA + dozenB;
  const totalPairs = totalDozen * 12;

  const expectedDozen = input.targetPerHour * input.shiftHours;
  const efficiency =
    expectedDozen > 0 ? Math.min(100, Math.round((totalDozen / expectedDozen) * 100)) : 0;

  const defectRate =
    totalDozen > 0 ? Number(((dozenB / totalDozen) * 100).toFixed(1)) : 0;

  const gradeARatio =
    totalDozen > 0 ? Number(((dozenA / totalDozen) * 100).toFixed(1)) : 100;

  return {
    totalDozen,
    totalPairs,
    expectedDozen,
    efficiency,
    defectRate,
    gradeARatio,
  };
}
