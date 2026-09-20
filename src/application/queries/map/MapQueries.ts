import type { SpatialBounds } from "../../spatial/PointSpatialIndex.js";

export interface VisibleVehiclesQuery {
  readonly type: "map.visibleVehicles";
  readonly payload: SpatialBounds;
}
