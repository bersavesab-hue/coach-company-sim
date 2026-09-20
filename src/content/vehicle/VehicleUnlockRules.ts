import type { Company } from "../../domain/company/Company.js";
import type {
  VehicleUnlockRule,
  VehicleUnlockTier
} from "./VehicleContentTypes.js";

const TIER_RULES: Readonly<Record<VehicleUnlockTier, VehicleUnlockRule>> = {
  1: {
    tier: 1,
    earliestGameDay: 1,
    minimumReputationPermille: 0,
    minimumOwnedVehicleCount: 0
  },
  2: {
    tier: 2,
    earliestGameDay: 4,
    minimumReputationPermille: 150,
    minimumOwnedVehicleCount: 2
  },
  3: {
    tier: 3,
    earliestGameDay: 10,
    minimumReputationPermille: 250,
    minimumOwnedVehicleCount: 5
  },
  4: {
    tier: 4,
    earliestGameDay: 20,
    minimumReputationPermille: 400,
    minimumOwnedVehicleCount: 10
  },
  5: {
    tier: 5,
    earliestGameDay: 35,
    minimumReputationPermille: 600,
    minimumOwnedVehicleCount: 18
  },
  6: {
    tier: 6,
    earliestGameDay: 60,
    minimumReputationPermille: 800,
    minimumOwnedVehicleCount: 30
  }
};

export function vehicleUnlockRuleForTier(
  tier: VehicleUnlockTier
): VehicleUnlockRule {
  return TIER_RULES[tier];
}

export interface VehicleUnlockContext {
  readonly company: Company;
  readonly gameDay: number;
  readonly ownedVehicleCount: number;
}

export interface VehicleUnlockEvaluation {
  readonly unlocked: boolean;
  readonly missing: readonly (
    | "game_day"
    | "reputation"
    | "fleet_size"
  )[];
}

export function evaluateVehicleUnlock(
  rule: VehicleUnlockRule,
  context: VehicleUnlockContext
): VehicleUnlockEvaluation {
  const missing: (
    | "game_day"
    | "reputation"
    | "fleet_size"
  )[] = [];

  if (context.gameDay < rule.earliestGameDay) {
    missing.push("game_day");
  }
  if (
    Number(context.company.reputationPermille) <
    rule.minimumReputationPermille
  ) {
    missing.push("reputation");
  }
  if (
    context.ownedVehicleCount <
    rule.minimumOwnedVehicleCount
  ) {
    missing.push("fleet_size");
  }

  return {
    unlocked: missing.length === 0,
    missing
  };
}
