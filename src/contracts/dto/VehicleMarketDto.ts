import type {
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleListingId,
  VehicleModelId,
  VehicleVariantId
} from "../ids/EntityIds.js";
import type { VehicleDealerKind } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleListingKind } from "../../domain/vehicle-market/VehicleListing.js";

export interface VehicleMarketListingDto {
  readonly listingId: VehicleListingId;
  readonly listingKind: VehicleListingKind;
  readonly dealerId: VehicleDealerId;
  readonly dealerName: string;
  readonly dealerKind: VehicleDealerKind;
  readonly brandName: string;
  readonly seriesName: string;
  readonly modelId: VehicleModelId;
  readonly modelName: string;
  readonly variantId: VehicleVariantId;
  readonly variantName: string;
  readonly modelYear: number;
  readonly configurationId: VehicleConfigurationId | null;
  readonly configurationName: string | null;
  readonly askingPriceCents: number;
  readonly stockCount: number;
  readonly seatCapacity: number | null;
  readonly energyCapacityUnits: number | null;
  readonly luggageCapacityL: number | null;
  readonly comfortPermille: number | null;
  readonly mileageM: number | null;
  readonly powertrainConditionPermille: number | null;
  readonly brakeConditionPermille: number | null;
  readonly tireConditionPermille: number | null;
  readonly bodyConditionPermille: number | null;
  readonly previousOwnerCount: number | null;
  readonly recordedAccidentCount: number | null;
}

export interface VehicleConfiguratorOptionDto {
  readonly code: string;
  readonly name: string;
  readonly priceDeltaCents: number;
  readonly seatCapacityDelta: number;
  readonly energyCapacityUnitsDelta: number;
  readonly luggageCapacityLDelta: number;
  readonly comfortPermilleDelta: number;
  readonly mutuallyExclusiveGroup: string | null;
}

export interface VehicleConfiguratorDto {
  readonly variantId: VehicleVariantId;
  readonly variantName: string;
  readonly modelId: VehicleModelId;
  readonly modelYear: number;
  readonly basePriceCents: number;
  readonly standardSeatCapacity: number;
  readonly standardEnergyCapacityUnits: number;
  readonly standardLuggageCapacityL: number;
  readonly standardComfortPermille: number;
  readonly options: readonly VehicleConfiguratorOptionDto[];
}
