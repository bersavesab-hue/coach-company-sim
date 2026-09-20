import type {
  VehicleVariantId
} from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface VehicleMarketListingsQuery {
  readonly type: "vehicleMarket.listings";
  readonly payload: {
    readonly currentGameSecond: GameSecond;
    readonly listingKind: "new" | "used" | null;
  };
}

export interface VehicleConfiguratorQuery {
  readonly type: "vehicleMarket.configurator";
  readonly payload: {
    readonly variantId: VehicleVariantId;
  };
}
