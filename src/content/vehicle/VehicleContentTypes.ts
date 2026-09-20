import type {
  VehicleBrandId,
  VehicleModelId,
  VehicleSeriesId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type { VehicleBrand } from "../../domain/vehicle-market/VehicleBrand.js";
import type { VehicleSeries } from "../../domain/vehicle-market/VehicleSeries.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { VehicleModelIdentity } from "../../domain/vehicle-market/VehicleModelIdentity.js";

export type VehicleMarketOrigin = "domestic" | "imported";

export type VehicleProductRole =
  | "rural_minibus"
  | "county_midibus"
  | "standard_coach"
  | "intercity_coach"
  | "premium_coach"
  | "tourist_coach"
  | "airport_shuttle"
  | "high_capacity_coach";

export type VehicleBrandPositioning =
  | "full_line_mainstream"
  | "traditional_long_distance"
  | "value_mainstream"
  | "county_rural"
  | "new_energy"
  | "premium_tourism"
  | "import_luxury"
  | "import_safety"
  | "import_compact"
  | "import_value";

export type VehicleUnlockTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface VehicleUnlockRule {
  readonly tier: VehicleUnlockTier;
  readonly earliestGameDay: number;
  readonly minimumReputationPermille: number;
  readonly minimumOwnedVehicleCount: number;
}

export interface VehicleBrandContentRecord {
  readonly brand: VehicleBrand;
  readonly latinName: string;
  readonly origin: VehicleMarketOrigin;
  readonly positioning: VehicleBrandPositioning;
}

export interface VehicleSeriesContentRecord {
  readonly series: VehicleSeries;
  readonly seriesCode: string;
  readonly displayName: string;
  readonly role: VehicleProductRole;
  readonly plannedModelCount: number;
  readonly baseUnlockTier: VehicleUnlockTier;
}

export interface VehicleModelContentMetadata {
  readonly modelId: VehicleModelId;
  readonly seriesId: VehicleSeriesId;
  readonly displayName: string;
  readonly role: VehicleProductRole;
  readonly unlock: VehicleUnlockRule;
}

export interface VehicleModelContentRecord {
  readonly model: VehicleModel;
  readonly identity: VehicleModelIdentity;
  readonly metadata: VehicleModelContentMetadata;
}

export interface VehicleVariantContentRecord {
  readonly variant: import("../../domain/vehicle-market/VehicleVariant.js").VehicleVariant;
  readonly lifecycle: VehicleVariantLifecycleMetadata;
}

export type VehicleMarketZoneCode =
  | "north"
  | "east"
  | "south"
  | "central"
  | "west"
  | "northeast";

export type VehicleDealerInventoryProfile =
  | "manufacturer_new"
  | "regional_mixed"
  | "used_budget"
  | "used_mainstream"
  | "used_premium"
  | "used_import"
  | "used_fleet"
  | "auction_general"
  | "auction_fleet"
  | "auction_premium";

export interface VehicleDealerContentRecord {
  readonly dealer: import("../../domain/vehicle-market/VehicleDealer.js").VehicleDealer;
  readonly marketZoneCode: VehicleMarketZoneCode | null;
  readonly inventoryProfile: VehicleDealerInventoryProfile;
  readonly newStockWeightPermille: number;
  readonly usedSupplyWeightPermille: number;
  readonly priceBiasPermille: number;
}

export interface VehicleMarketZoneDemandProfile {
  readonly zoneCode: VehicleMarketZoneCode;
  readonly minibusDemandPermille: number;
  readonly midibusDemandPermille: number;
  readonly coachDemandPermille: number;
  readonly premiumDemandPermille: number;
  readonly tourismDemandPermille: number;
  readonly newEnergyDemandPermille: number;
  readonly priceSensitivityPermille: number;
}

export interface VehicleVariantLifecycleMetadata {
  readonly variantId: VehicleVariantId;
  readonly launchGameDay: number;
  readonly productionEndGameDay: number | null;
  readonly dealerClearanceEndGameDay: number | null;
}
