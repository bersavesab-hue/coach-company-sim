import { ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type {
  VehicleConfiguratorQuery,
  VehicleMarketAuctionsQuery,
  VehicleMarketInspectionsQuery,
  VehicleMarketListingsQuery,
  VehicleMarketValuationQuery
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
        typed.payload.listingKind,
        typed.payload.viewerCompanyId
      )
    );
  });

  queries.register("vehicleMarket.configurator", (query) => {
    const typed = query as VehicleConfiguratorQuery;
    return ok(
      projection.configurator(typed.payload.variantId)
    );
  });

  queries.register("vehicleMarket.valuation", (query) => {
    const typed = query as VehicleMarketValuationQuery;
    return ok(
      projection.valuationForOwnedVehicle(
        typed.payload.vehicleId,
        typed.payload.dealerId,
        typed.payload.currentGameSecond
      )
    );
  });

  queries.register("vehicleMarket.inspections", (query) => {
    const typed = query as VehicleMarketInspectionsQuery;
    return ok(
      projection.inspections(
        typed.payload.companyId,
        typed.payload.listingId
      )
    );
  });

  queries.register("vehicleMarket.auctions", (query) => {
    const typed = query as VehicleMarketAuctionsQuery;
    return ok(
      projection.auctions(typed.payload.companyId)
    );
  });
}
