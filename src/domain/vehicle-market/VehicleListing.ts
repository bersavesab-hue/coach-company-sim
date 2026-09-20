import type {
  CompanyId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleListingId,
  VehicleModelId,
  VehicleId,
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

export interface UsedVehicleDisclosure {
  readonly reportedMileageM: DistanceM;
  readonly reportedAccidentCount: number | null;
  readonly reportedConditionPermille: Permille | null;
}

export interface VehicleListingReservation {
  readonly buyerCompanyId: CompanyId;
  readonly agreedPriceCents: MoneyCents;
  readonly expiresAtGameSecond: GameSecond;
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
  readonly sourceVehicleId: VehicleId | null;
  readonly askingPriceCents: MoneyCents;
  readonly sellerDisclosure: UsedVehicleDisclosure | null;
  readonly reservation: VehicleListingReservation | null;
  readonly stockCount: number;
  readonly usedSnapshot: UsedVehicleSnapshot | null;
  readonly listedAtGameSecond: GameSecond;
  readonly availableFromGameSecond: GameSecond;
  readonly expiresAtGameSecond: GameSecond | null;
  readonly status: VehicleListingStatus;
}
