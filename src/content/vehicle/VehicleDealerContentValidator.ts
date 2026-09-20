import type {
  VehicleBrandContentRecord,
  VehicleDealerContentRecord,
  VehicleMarketZoneCode
} from "./VehicleContentTypes.js";

export interface VehicleDealerContentIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleDealerValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleDealerContentIssue[];
  readonly counts: {
    readonly total: number;
    readonly manufacturer: number;
    readonly regional: number;
    readonly used: number;
    readonly auction: number;
  };
}

const MARKET_ZONES = new Set<VehicleMarketZoneCode>([
  "north",
  "east",
  "south",
  "central",
  "west",
  "northeast"
]);

export function validateVehicleDealerContent(input: {
  readonly brands: readonly VehicleBrandContentRecord[];
  readonly dealers: readonly VehicleDealerContentRecord[];
  readonly expectedDealerCount?: number;
}): VehicleDealerValidationResult {
  const issues: VehicleDealerContentIssue[] = [];
  const brandIds = new Set(
    input.brands.map((record) =>
      String(record.brand.id)
    )
  );
  const dealerIds = new Set<string>();
  const dealerNames = new Set<string>();
  const manufacturerCoverage = new Map<string, number>();

  for (const record of input.dealers) {
    const dealer = record.dealer;
    const id = String(dealer.id);

    if (dealerIds.has(id)) {
      issue(issues, "error", "DUPLICATE_DEALER_ID", "Dealer ID is duplicated", id);
    }
    dealerIds.add(id);

    if (dealerNames.has(dealer.name)) {
      issue(issues, "error", "DUPLICATE_DEALER_NAME", "Dealer name is duplicated", id);
    }
    dealerNames.add(dealer.name);

    if (dealer.supportedBrandIds.length === 0) {
      issue(issues, "error", "DEALER_HAS_NO_BRANDS", "Dealer must support at least one brand", id);
    }

    const localBrands = new Set<string>();
    for (const brandId of dealer.supportedBrandIds) {
      const key = String(brandId);
      if (!brandIds.has(key)) {
        issue(issues, "error", "DEALER_BRAND_NOT_FOUND", `Dealer references unknown brand ${key}`, id);
      }
      if (localBrands.has(key)) {
        issue(issues, "error", "DEALER_DUPLICATE_BRAND", `Dealer repeats supported brand ${key}`, id);
      }
      localBrands.add(key);
    }

    if (dealer.regionId !== null) {
      issue(
        issues,
        "error",
        "DEALER_PREMATURE_REGION_BINDING",
        "Stage 15 dealer content must not invent canonical world RegionId before world regions exist",
        id
      );
    }

    if (
      record.marketZoneCode !== null &&
      !MARKET_ZONES.has(record.marketZoneCode)
    ) {
      issue(issues, "error", "DEALER_ZONE_UNKNOWN", "Dealer market zone is unknown", id);
    }

    for (const [field, value] of [
      ["newStockWeightPermille", record.newStockWeightPermille],
      ["usedSupplyWeightPermille", record.usedSupplyWeightPermille],
      ["priceBiasPermille", record.priceBiasPermille]
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 2000) {
        issue(
          issues,
          "error",
          "DEALER_WEIGHT_INVALID",
          `${field} must be an integer from 0 to 2000`,
          id
        );
      }
    }

    if (dealer.kind === "manufacturer_dealer") {
      if (dealer.supportedBrandIds.length !== 1) {
        issue(issues, "error", "MANUFACTURER_DEALER_BRAND_COUNT", "Manufacturer dealer must support exactly one brand", id);
      }
      if (record.marketZoneCode !== null) {
        issue(issues, "error", "MANUFACTURER_DEALER_ZONE", "Manufacturer network must remain nationwide at content level", id);
      }
      if (record.usedSupplyWeightPermille !== 0) {
        issue(issues, "error", "MANUFACTURER_USED_SUPPLY", "Manufacturer dealer cannot generate generic used supply", id);
      }
      for (const brandId of dealer.supportedBrandIds) {
        const key = String(brandId);
        manufacturerCoverage.set(
          key,
          (manufacturerCoverage.get(key) ?? 0) + 1
        );
      }
    } else {
      if (record.marketZoneCode === null) {
        issue(issues, "error", "REGIONAL_DEALER_ZONE_MISSING", "Non-manufacturer dealer requires a market zone", id);
      }
    }

    if (
      (dealer.kind === "used_vehicle_dealer" ||
        dealer.kind === "auction_house") &&
      record.newStockWeightPermille !== 0
    ) {
      issue(issues, "error", "USED_SOURCE_NEW_STOCK", "Used dealers and auction houses cannot generate normal new stock", id);
    }
  }

  for (const brandId of brandIds) {
    if ((manufacturerCoverage.get(brandId) ?? 0) !== 1) {
      issue(
        issues,
        "error",
        "MANUFACTURER_COVERAGE_INVALID",
        `Brand requires exactly one manufacturer dealer network: ${brandId}`,
        brandId
      );
    }
  }

  const counts = {
    total: input.dealers.length,
    manufacturer: input.dealers.filter(
      (record) => record.dealer.kind === "manufacturer_dealer"
    ).length,
    regional: input.dealers.filter(
      (record) => record.dealer.kind === "regional_dealer"
    ).length,
    used: input.dealers.filter(
      (record) => record.dealer.kind === "used_vehicle_dealer"
    ).length,
    auction: input.dealers.filter(
      (record) => record.dealer.kind === "auction_house"
    ).length
  };

  if (
    counts.manufacturer !== 10 ||
    counts.regional !== 6 ||
    counts.used !== 5 ||
    counts.auction !== 3
  ) {
    issue(
      issues,
      "error",
      "DEALER_KIND_DISTRIBUTION_INVALID",
      `Dealer distribution must be 10/6/5/3, found ${counts.manufacturer}/${counts.regional}/${counts.used}/${counts.auction}`,
      null
    );
  }

  if (
    input.expectedDealerCount !== undefined &&
    counts.total !== input.expectedDealerCount
  ) {
    issue(
      issues,
      "error",
      "UNEXPECTED_DEALER_COUNT",
      `Expected ${input.expectedDealerCount} dealers but found ${counts.total}`,
      null
    );
  }

  return {
    valid: issues.every((value) => value.severity !== "error"),
    issues,
    counts
  };
}

function issue(
  issues: VehicleDealerContentIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({ severity, code, message, ref });
}
