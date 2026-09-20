import type { QueryBus } from "../../QueryBus.js";
import { ok } from "../../../core/result/Result.js";
import type { VehicleSpatialIndex } from "../../spatial/VehicleSpatialIndex.js";
import type { VisibleVehiclesQuery } from "../../queries/map/MapQueries.js";

export function registerMapQueries(
  queries: QueryBus,
  vehicleIndex: VehicleSpatialIndex
): void {
  queries.register("map.visibleVehicles", (query) => {
    const typed = query as VisibleVehiclesQuery;
    return ok(vehicleIndex.query(typed.payload));
  });
}
