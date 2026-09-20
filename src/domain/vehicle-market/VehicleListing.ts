import type {
  CompanyId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleListingId,
  VehicleModelId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  GameSecond,
  MoneyCents,
  Permille
} from "../../core/units/Units.js";

export type VehicleListingKind = "new" | "used";
export type VehicleListingStatus =
  | "available"
  | "reserved"
  | "sold"
  | "withdrawn"
  | "expired";

export interface UsedVehicleSnapshot {
  readonly mileageM: DistanceM;
  readonly energyUnits: number;
  readonly lastMaintenanceMileageM: DistanceM;
  readonly nextMaintenanceMileageM: DistanceM;
  readonly registeredAtGameSecond: GameSecond;
  readonly insuranceValidUntilGameSecond: GameSecond;
  readonly inspectionValidUntilGameSecond: GameSecond;
  readonly powertrainConditionPermille: Permille;
  readonly brakeConditionPermille: Permille;
  readonly tireConditionPermille: Permille;
  readonly bodyConditionPermille: Permille;
  readonly previousOwnerCount: number;
  readonly recordedAccidentCount: number;
}

export interface VehicleListing {
  readonly id: VehicleListingId;
  readonly dealerId: VehicleDealerId;
  readonly kind: VehicleListingKind;
  readonly modelId: VehicleModelId;
  readonly variantId: VehicleVariantId;
  // Used listings have a fixed physical configuration. New listings may
  // allow the buyer to supply another valid configuration for the same variant.
  readonly configurationId: VehicleConfigurationId | null;
  readonly sellerCompanyId: CompanyId | null;
  readonly askingPriceCents: MoneyCents;
  readonly stockCount: number;
  readonly usedSnapshot: UsedVehicleSnapshot | null;
  readonly availableFromGameSecond: GameSecond;
  readonly expiresAtGameSecond: GameSecond | null;
  readonly status: VehicleListingStatus;
}
