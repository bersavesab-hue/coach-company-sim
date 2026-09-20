import type {
  VehicleDealerContentRecord,
  VehicleMarketZoneDemandProfile
} from "./VehicleContentTypes.js";

export interface VehicleMarketDemandContentIssue {
  readonly severity: "error";
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleMarketDemandValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleMarketDemandContentIssue[];
  readonly counts: {
    readonly zones: number;
    readonly zonedDealers: number;
  };
}

const EXPECTED_ZONES = new Set([
  "north",
  "east",
  "south",
  "central",
  "west",
  "northeast"
]);

const DEMAND_FIELDS = [
  "minibusDemandPermille",
  "midibusDemandPermille",
  "coachDemandPermille",
  "premiumDemandPermille",
  "tourismDemandPermille",
  "newEnergyDemandPermille",
  "priceSensitivityPermille"
] as const;

export function validateVehicleMarketDemandContent(input: {
  readonly profiles: readonly VehicleMarketZoneDemandProfile[];
  readonly dealers: readonly VehicleDealerContentRecord[];
}): VehicleMarketDemandValidationResult {
  const issues: VehicleMarketDemandContentIssue[] = [];
  const seen = new Set<string>();

  for (const profile of input.profiles) {
    const zone = profile.zoneCode;
    if (seen.has(zone)) {
      push(
        issues,
        "DUPLICATE_MARKET_ZONE",
        "Vehicle market zone demand profile is duplicated",
        zone
      );
    }
    seen.add(zone);

    if (!EXPECTED_ZONES.has(zone)) {
      push(
        issues,
        "UNKNOWN_MARKET_ZONE",
        "Vehicle market demand profile uses an unknown zone",
        zone
      );
    }

    for (const field of DEMAND_FIELDS) {
      const value = profile[field];
      if (
        !Number.isSafeInteger(value) ||
        value < 500 ||
        value > 1500
      ) {
        push(
          issues,
          "INVALID_MARKET_DEMAND_PERMILLE",
          `${field} must be an integer within 500..1500`,
          zone
        );
      }
    }
  }

  for (const zone of EXPECTED_ZONES) {
    if (!seen.has(zone)) {
      push(
        issues,
        "MARKET_ZONE_PROFILE_MISSING",
        "Required vehicle market zone has no demand profile",
        zone
      );
    }
  }

  let zonedDealers = 0;
  for (const record of input.dealers) {
    if (record.marketZoneCode === null) {
      if (record.dealer.kind !== "manufacturer_dealer") {
        push(
          issues,
          "DEALER_MARKET_ZONE_MISSING",
          "Non-manufacturer dealer requires a market zone",
          String(record.dealer.id)
        );
      }
      continue;
    }

    zonedDealers += 1;
    if (!seen.has(record.marketZoneCode)) {
      push(
        issues,
        "DEALER_MARKET_ZONE_UNKNOWN",
        "Dealer references a market zone without a demand profile",
        String(record.dealer.id)
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    counts: {
      zones: input.profiles.length,
      zonedDealers
    }
  };
}

function push(
  issues: VehicleMarketDemandContentIssue[],
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({
    severity: "error",
    code,
    message,
    ref
  });
}
