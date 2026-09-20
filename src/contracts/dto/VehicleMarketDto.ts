import type {
  CompanyId,
  VehicleAuctionId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleInspectionReportId,
  VehicleListingId,
  VehicleModelId,
  VehicleVariantId
} from "../ids/EntityIds.js";
import type { VehicleDealerKind } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleInspectionLevel } from "../../domain/vehicle-market/VehicleInspectionReport.js";
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
  readonly reportedMileageM: number | null;
  readonly reportedConditionPermille: number | null;
  readonly reportedAccidentCount: number | null;
  readonly previousOwnerCount: number | null;
  readonly reservationStatus:
    | "none"
    | "reserved_for_you"
    | "reserved_for_other";
  readonly yourAgreedPriceCents: number | null;
  readonly auctionId: VehicleAuctionId | null;
  readonly auctionStatus: "scheduled" | "open" | null;
  readonly highestBidCents: number | null;
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

export interface VehicleMarketValuationDto {
  readonly fairMarketValueCents: number;
  readonly dealerBuyOfferCents: number;
  readonly suggestedAskingPriceCents: number;
}

export interface VehicleInspectionReportDto {
  readonly inspectionReportId: VehicleInspectionReportId;
  readonly listingId: VehicleListingId;
  readonly level: VehicleInspectionLevel;
  readonly inspectedAtGameSecond: number;
  readonly costCents: number;
  readonly mileageVerified: boolean;
  readonly verifiedMileageM: number | null;
  readonly mechanicalConditionPermille: number;
  readonly bodyConditionPermille: number;
  readonly accidentEvidenceCount: number | null;
  readonly disclosureMismatch: boolean;
}

export interface VehicleAuctionDto {
  readonly auctionId: VehicleAuctionId;
  readonly listingId: VehicleListingId;
  readonly sellerCompanyId: CompanyId;
  readonly startsAtGameSecond: number;
  readonly endsAtGameSecond: number;
  readonly reservePriceCents: number | null;
  readonly highestBidCents: number | null;
  readonly highestBidderCompanyId: CompanyId | null;
  readonly status: string;
}
