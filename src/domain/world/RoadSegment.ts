import type {
  RegionId,
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  SpeedMps
} from "../../core/units/Units.js";
import type { WorldPoint } from "./WorldPoint.js";

export type RoadDirection = "both" | "forward" | "reverse";

export type RoadClass =
  | "local"
  | "county_road"
  | "provincial_road"
  | "national_road"
  | "expressway";

export interface RoadSegment {
  readonly id: RoadSegmentId;
  readonly regionId: RegionId;
  readonly fromNodeId: WorldNodeId;
  readonly toNodeId: WorldNodeId;
  readonly lengthM: DistanceM;
  readonly speedLimitMps: SpeedMps;
  readonly roadClass: RoadClass;
  readonly direction: RoadDirection;
  readonly polyline: readonly WorldPoint[];
  readonly active: boolean;
}
