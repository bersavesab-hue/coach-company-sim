import type {
  VehicleBrandId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleListingId,
  VehicleModelId,
  VehicleSeriesId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type { VehicleBrand } from "../../domain/vehicle-market/VehicleBrand.js";
import type { VehicleConfiguration } from "../../domain/vehicle-market/VehicleConfiguration.js";
import type { VehicleDealer } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleModelIdentity } from "../../domain/vehicle-market/VehicleModelIdentity.js";
import type { VehicleOptionDefinition } from "../../domain/vehicle-market/VehicleOptionDefinition.js";
import type { VehicleSeries } from "../../domain/vehicle-market/VehicleSeries.js";
import type { VehicleVariant } from "../../domain/vehicle-market/VehicleVariant.js";

export interface VehicleMarketRepository {
  getBrand(id: VehicleBrandId): VehicleBrand | undefined;
  getSeries(id: VehicleSeriesId): VehicleSeries | undefined;
  getModelIdentity(id: VehicleModelId): VehicleModelIdentity | undefined;
  getVariant(id: VehicleVariantId): VehicleVariant | undefined;
  getOption(code: string): VehicleOptionDefinition | undefined;
  getConfiguration(
    id: VehicleConfigurationId
  ): VehicleConfiguration | undefined;
  saveConfiguration(configuration: VehicleConfiguration): void;
  getDealer(id: VehicleDealerId): VehicleDealer | undefined;
  getListing(id: VehicleListingId): VehicleListing | undefined;
  findAvailableListings(): readonly VehicleListing[];
  saveListing(listing: VehicleListing): void;
}
