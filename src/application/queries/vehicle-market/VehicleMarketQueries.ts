import type {
  CompanyId,
  VehicleDealerId,
  VehicleListingId,
  VehicleVariantId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface VehicleMarketListingsQuery {
  readonly type: "vehicleMarket.listings";
  readonly payload: {
    readonly currentGameSecond: GameSecond;
    readonly listingKind: "new" | "used" | null;
    readonly viewerCompanyId?: CompanyId;
  };
}

export interface VehicleConfiguratorQuery {
  readonly type: "vehicleMarket.configurator";
  readonly payload: {
    readonly variantId: VehicleVariantId;
  };
}

export interface VehicleMarketValuationQuery {
  readonly type: "vehicleMarket.valuation";
  readonly payload: {
    readonly vehicleId: VehicleId;
    readonly dealerId: VehicleDealerId;
    readonly currentGameSecond: GameSecond;
  };
}

export interface VehicleMarketInspectionsQuery {
  readonly type: "vehicleMarket.inspections";
  readonly payload: {
    readonly companyId: CompanyId;
    readonly listingId: VehicleListingId;
  };
}

export interface VehicleMarketAuctionsQuery {
  readonly type: "vehicleMarket.auctions";
  readonly payload: {
    readonly companyId: CompanyId;
  };
}
