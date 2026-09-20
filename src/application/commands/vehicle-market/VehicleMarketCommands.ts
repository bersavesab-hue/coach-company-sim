import type {
  CompanyId,
  StationId,
  VehicleAuctionId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleListingId,
  VehicleVariantId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";

export interface CreateVehicleConfigurationPayload {
  readonly variantId: VehicleVariantId;
  readonly customName: string | null;
  readonly selectedOptionCodes: readonly string[];
  readonly exteriorColorCode: string | null;
  readonly liveryCode: string | null;
}

export interface PurchaseVehicleListingPayload {
  readonly companyId: CompanyId;
  readonly listingId: VehicleListingId;
  readonly configurationId: VehicleConfigurationId | null;
  readonly depotStationId: StationId | null;
}

import type {
  GameSecond,
  MoneyCents,
  Permille
} from "../../../core/units/Units.js";
import type { VehicleInspectionLevel } from "../../../domain/vehicle-market/VehicleInspectionReport.js";

export interface ListOwnedVehiclePayload {
  readonly companyId: CompanyId;
  readonly vehicleId: VehicleId;
  readonly dealerId: VehicleDealerId;
  readonly askingPriceCents: MoneyCents | null;
  readonly expiresAtGameSecond: GameSecond | null;
  readonly reportedAccidentCount: number | null;
  readonly reportedConditionPermille: Permille | null;
}

export interface WithdrawVehicleListingPayload {
  readonly listingId: VehicleListingId;
}

export interface InspectVehicleListingPayload {
  readonly companyId: CompanyId;
  readonly listingId: VehicleListingId;
  readonly level: VehicleInspectionLevel;
}

export interface NegotiateVehicleListingPayload {
  readonly companyId: CompanyId;
  readonly listingId: VehicleListingId;
  readonly offerPriceCents: MoneyCents;
}

export interface StartVehicleAuctionPayload {
  readonly companyId: CompanyId;
  readonly listingId: VehicleListingId;
  readonly startsAtGameSecond: GameSecond;
  readonly endsAtGameSecond: GameSecond;
  readonly reservePriceCents: MoneyCents;
}

export interface PlaceVehicleAuctionBidPayload {
  readonly companyId: CompanyId;
  readonly auctionId: VehicleAuctionId;
  readonly bidCents: MoneyCents;
}

export interface SettleVehicleAuctionPayload {
  readonly companyId: CompanyId;
  readonly auctionId: VehicleAuctionId;
}

export interface RefreshVehicleMarketPayload {}

export interface SellVehicleToDealerPayload {
  readonly companyId: CompanyId;
  readonly vehicleId: VehicleId;
  readonly dealerId: VehicleDealerId;
}
