/**
 * Machine status operational lifecycle.
 */
export type MachineStatus = "RUNNING" | "IDLE" | "MAINTENANCE" | "STOPPED";

export type MachineTelemetry = {
  machineNo: number;
  needleCount: number;
  cylinderSize: string;
  rpm: number;
  status: MachineStatus;
  targetPerHourDozen: number;
  shiftHours: number;
  actualDozen: number;
  expectedDozen: number;
  efficiencyPercent: number;
  oeePercent: number;
};

/**
 * Computes machine performance telemetry and Overall Equipment Effectiveness (OEE) metrics.
 *
 * @param params - Machine operating parameters.
 * @returns MachineTelemetry detailing throughput, efficiency %, and OEE score.
 */
export function calculateMachineTelemetry(params: {
  machineNo: number;
  needleCount: number;
  cylinderSize: string;
  rpm: number;
  status: MachineStatus;
  targetPerHourDozen: number;
  shiftHours: number;
  actualDozen: number;
  qualityDozenA: number;
}): MachineTelemetry {
  const {
    machineNo,
    needleCount,
    cylinderSize,
    rpm,
    status,
    targetPerHourDozen,
    shiftHours,
    actualDozen,
    qualityDozenA,
  } = params;

  const expectedDozen = targetPerHourDozen * shiftHours;
  const efficiencyPercent =
    expectedDozen > 0 ? Math.min(100, Math.round((actualDozen / expectedDozen) * 100)) : 0;

  // Availability factor: 1.0 if running, 0.85 if idle, 0.5 if maintenance
  const availability = status === "RUNNING" ? 1.0 : status === "IDLE" ? 0.85 : 0.5;
  // Performance factor: actual / expected
  const performance = Math.min(1.0, actualDozen / (expectedDozen || 1));
  // Quality factor: First quality Category A / Total produced
  const quality = actualDozen > 0 ? qualityDozenA / actualDozen : 1.0;

  const oeePercent = Math.round(availability * performance * quality * 100);

  return {
    machineNo,
    needleCount,
    cylinderSize,
    rpm,
    status,
    targetPerHourDozen,
    shiftHours,
    actualDozen,
    expectedDozen,
    efficiencyPercent,
    oeePercent,
  };
}
