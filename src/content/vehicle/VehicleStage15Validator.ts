import { VEHICLE_BRANDS } from "./VehicleBrandCatalog.js";
import { VEHICLE_DEALERS } from "./VehicleDealerCatalog.js";
import { VEHICLE_MARKET_ZONE_DEMAND_PROFILES } from "./VehicleMarketDemandCatalog.js";
import { VEHICLE_MODELS } from "./VehicleModelCatalog.js";
import { VEHICLE_OPTIONS } from "./VehicleOptionCatalog.js";
import { VEHICLE_SERIES } from "./VehicleSeriesCatalog.js";
import { VEHICLE_VARIANTS } from "./VehicleVariantCatalog.js";
import { validateVehicleContent } from "./VehicleContentValidator.js";
import { validateVehicleDealerContent } from "./VehicleDealerContentValidator.js";
import { validateVehicleMarketDemandContent } from "./VehicleMarketDemandContentValidator.js";
import { validateVehicleOptionContent } from "./VehicleOptionContentValidator.js";
import { validateVehicleVariantContent } from "./VehicleVariantContentValidator.js";

export interface VehicleStage15ValidationIssue {
  readonly source:
    | "base"
    | "variant"
    | "option"
    | "dealer"
    | "market_demand";
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleStage15ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleStage15ValidationIssue[];
  readonly counts: {
    readonly brands: number;
    readonly series: number;
    readonly models: number;
    readonly variants: number;
    readonly options: number;
    readonly dealers: number;
    readonly marketZones: number;
  };
}

export function validateStage15VehicleContent():
  VehicleStage15ValidationResult {
  const base = validateVehicleContent({
    brands: VEHICLE_BRANDS,
    series: VEHICLE_SERIES,
    models: VEHICLE_MODELS,
    expectedModelCount: 100,
    requireCompleteSeries: true
  });
  const variants = validateVehicleVariantContent({
    models: VEHICLE_MODELS,
    variants: VEHICLE_VARIANTS,
    expectedVariantCount: 180
  });
  const options = validateVehicleOptionContent({
    models: VEHICLE_MODELS,
    variants: VEHICLE_VARIANTS,
    options: VEHICLE_OPTIONS,
    expectedOptionCount: 48
  });
  const dealers = validateVehicleDealerContent({
    brands: VEHICLE_BRANDS,
    dealers: VEHICLE_DEALERS,
    expectedDealerCount: 24
  });
  const marketDemand =
    validateVehicleMarketDemandContent({
      profiles:
        VEHICLE_MARKET_ZONE_DEMAND_PROFILES,
      dealers: VEHICLE_DEALERS
    });

  const issues: VehicleStage15ValidationIssue[] = [
    ...tag("base", base.issues),
    ...tag("variant", variants.issues),
    ...tag("option", options.issues),
    ...tag("dealer", dealers.issues),
    ...tag("market_demand", marketDemand.issues)
  ];

  return {
    valid: issues.every(
      (issue) => issue.severity !== "error"
    ),
    issues,
    counts: {
      brands: VEHICLE_BRANDS.length,
      series: VEHICLE_SERIES.length,
      models: VEHICLE_MODELS.length,
      variants: VEHICLE_VARIANTS.length,
      options: VEHICLE_OPTIONS.length,
      dealers: VEHICLE_DEALERS.length,
      marketZones:
        VEHICLE_MARKET_ZONE_DEMAND_PROFILES.length
    }
  };
}

function tag(
  source: VehicleStage15ValidationIssue["source"],
  issues: readonly {
    readonly severity: "error" | "warning";
    readonly code: string;
    readonly message: string;
    readonly ref: string | null;
  }[]
): VehicleStage15ValidationIssue[] {
  return issues.map((issue) => ({
    source,
    ...issue
  }));
}
