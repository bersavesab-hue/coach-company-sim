import type { Permille } from "../../core/units/Units.js";

const DEMAND_DENOMINATOR = 3_600_000;

export interface DemandGenerationResult {
  readonly generatedPassengers: number;
  readonly remainderUnits: number;
}

export function generatePassengerDemand(
  basePassengersPerHour: number,
  frequencyMultiplierPermille: Permille,
  elapsedSeconds: number,
  previousRemainderUnits: number
): DemandGenerationResult {
  for (const [label, value] of [
    ["basePassengersPerHour", basePassengersPerHour],
    ["elapsedSeconds", elapsedSeconds],
    ["previousRemainderUnits", previousRemainderUnits]
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${label} must be a non-negative safe integer`);
    }
  }

  const numerator =
    basePassengersPerHour *
      Number(frequencyMultiplierPermille) *
      elapsedSeconds +
    previousRemainderUnits;

  return {
    generatedPassengers: Math.floor(numerator / DEMAND_DENOMINATOR),
    remainderUnits: numerator % DEMAND_DENOMINATOR
  };
}
