import type {
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import type { TraversalDirection } from "./RoadTraversal.js";
import type { RoutingPreference } from "./RoutingCost.js";

export interface PathLeg {
  readonly roadSegmentId: RoadSegmentId;
  readonly direction: TraversalDirection;
  readonly fromNodeId: WorldNodeId;
  readonly toNodeId: WorldNodeId;
}

export interface RoadPath {
  readonly fromNodeId: WorldNodeId;
  readonly toNodeId: WorldNodeId;
  readonly preference: RoutingPreference;
  readonly totalCost: number;
  readonly legs: readonly PathLeg[];
}
