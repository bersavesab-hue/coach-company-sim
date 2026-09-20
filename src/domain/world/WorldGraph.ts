import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type {
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import type { RoadSegment } from "./RoadSegment.js";
import type { WorldNode } from "./WorldNode.js";

export class WorldGraph {
  private constructor(
    private readonly nodes: ReadonlyMap<WorldNodeId, WorldNode>,
    private readonly roads: ReadonlyMap<RoadSegmentId, RoadSegment>
  ) {}

  static create(
    nodes: readonly WorldNode[],
    roads: readonly RoadSegment[]
  ): Result<WorldGraph, DomainError> {
    const nodeMap = new Map<WorldNodeId, WorldNode>();
    const roadMap = new Map<RoadSegmentId, RoadSegment>();

    for (const node of nodes) {
      if (nodeMap.has(node.id)) {
        return err(
          new DomainError("DUPLICATE_ID", "Duplicate world node ID", {
            nodeId: node.id
          })
        );
      }
      nodeMap.set(node.id, node);
    }

    for (const road of roads) {
      if (roadMap.has(road.id)) {
        return err(
          new DomainError("DUPLICATE_ID", "Duplicate road segment ID", {
            roadId: road.id
          })
        );
      }

      if (!nodeMap.has(road.fromNodeId) || !nodeMap.has(road.toNodeId)) {
        return err(
          new DomainError(
            "REFERENCE_NOT_FOUND",
            "Road references a missing world node",
            { roadId: road.id }
          )
        );
      }

      roadMap.set(road.id, road);
    }

    return ok(new WorldGraph(nodeMap, roadMap));
  }

  getNode(id: WorldNodeId): WorldNode | undefined {
    return this.nodes.get(id);
  }

  getRoad(id: RoadSegmentId): RoadSegment | undefined {
    return this.roads.get(id);
  }

  allNodes(): readonly WorldNode[] {
    return [...this.nodes.values()];
  }

  allRoads(): readonly RoadSegment[] {
    return [...this.roads.values()];
  }
}
