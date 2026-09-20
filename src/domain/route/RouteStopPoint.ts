import type { StationId } from "../../contracts/ids/EntityIds.js";

export interface RouteStopPoint {
  readonly stationId: StationId;
  readonly pathLegBoundaryIndex: number;
}
