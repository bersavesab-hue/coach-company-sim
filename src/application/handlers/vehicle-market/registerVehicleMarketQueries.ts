import { ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type {
  VehicleConfiguratorQuery,
  VehicleMarketListingsQuery
} from "../../queries/vehicle-market/VehicleMarketQueries.js";
import type { VehicleMarketProjection } from "../../services/VehicleMarketProjection.js";

export function registerVehicleMarketQueries(
  queries: QueryBus,
  projection: VehicleMarketProjection
): void {
  queries.register("vehicleMarket.listings", (query) => {
    const typed = query as VehicleMarketListingsQuery;
    return ok(
      projection.listings(
        typed.payload.currentGameSecond,
        typed.payload.listingKind
      )
    );
  });

  queries.register("vehicleMarket.configurator", (query) => {
    const typed = query as VehicleConfiguratorQuery;
    return ok(
      projection.configurator(typed.payload.variantId)
    );
  });
}
