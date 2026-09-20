import type { GameSecond } from "../../core/units/Units.js";

export type SimulationTier =
  | "foreground"
  | "regional"
  | "background";

export const SIMULATION_TIER_INTERVAL_SECONDS: Readonly<
  Record<SimulationTier, number>
> = {
  foreground: 1,
  regional: 15,
  background: 300
};

export function isSimulationTierDue(
  lastUpdatedGameSecond: GameSecond,
  targetGameSecond: GameSecond,
  tier: SimulationTier
): boolean {
  const elapsed =
    Number(targetGameSecond) - Number(lastUpdatedGameSecond);

  if (elapsed < 0) return false;

  return (
    elapsed >= SIMULATION_TIER_INTERVAL_SECONDS[tier]
  );
}
