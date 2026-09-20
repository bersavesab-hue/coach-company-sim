import type {
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  SpeedMps
} from "../../core/units/Units.js";
import type { WorldPoint } from "./WorldPoint.js";

export type RoadDirection = "both" | "forward" | "reverse";

export interface RoadSegment {
  readonly id: RoadSegmentId;
  readonly fromNodeId: WorldNodeId;
  readonly toNodeId: WorldNodeId;
  readonly lengthM: DistanceM;
  readonly speedLimitMps: SpeedMps;
  readonly roadClass: string;
  readonly direction: RoadDirection;
  readonly polyline: readonly WorldPoint[];
  readonly active: boolean;
}
