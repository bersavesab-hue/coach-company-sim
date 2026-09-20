import type {
  CompanyId,
  StationId,
  VehicleConfigurationId,
  VehicleListingId,
  VehicleVariantId
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
