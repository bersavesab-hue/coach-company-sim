import type {
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";

export type TraversalDirection = "forward" | "reverse";

export interface RoadTraversal {
  readonly roadSegmentId: RoadSegmentId;
  readonly fromNodeId: WorldNodeId;
  readonly toNodeId: WorldNodeId;
  readonly direction: TraversalDirection;
}
