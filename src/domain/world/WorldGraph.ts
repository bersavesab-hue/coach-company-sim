import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type {
  RegionId,
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import type { Region } from "./Region.js";
import type { RoadSegment } from "./RoadSegment.js";
import type { RoadTraversal } from "./RoadTraversal.js";
import type { WorldNode } from "./WorldNode.js";

export class WorldGraph {
  private readonly adjacency: ReadonlyMap<
    WorldNodeId,
    readonly RoadTraversal[]
  >;

  private constructor(
    private readonly regions: ReadonlyMap<RegionId, Region>,
    private readonly nodes: ReadonlyMap<WorldNodeId, WorldNode>,
    private readonly roads: ReadonlyMap<RoadSegmentId, RoadSegment>
  ) {
    this.adjacency = buildAdjacency(nodes, roads);
  }

  static create(
    regions: readonly Region[],
    nodes: readonly WorldNode[],
    roads: readonly RoadSegment[]
  ): Result<WorldGraph, DomainError> {
    const regionMap = new Map<RegionId, Region>();
    const nodeMap = new Map<WorldNodeId, WorldNode>();
    const roadMap = new Map<RoadSegmentId, RoadSegment>();

    for (const region of regions) {
      if (regionMap.has(region.id)) {
        return err(
          new DomainError("DUPLICATE_ID", "Duplicate region ID", {
            regionId: region.id
          })
        );
      }
      regionMap.set(region.id, region);
    }

    for (const region of regions) {
      if (
        region.parentRegionId !== null &&
        !regionMap.has(region.parentRegionId)
      ) {
        return err(
          new DomainError(
            "REFERENCE_NOT_FOUND",
            "Region references a missing parent region",
            { regionId: region.id, parentRegionId: region.parentRegionId }
          )
        );
      }
    }

    for (const node of nodes) {
      if (nodeMap.has(node.id)) {
        return err(
          new DomainError("DUPLICATE_ID", "Duplicate world node ID", {
            nodeId: node.id
          })
        );
      }

      if (!regionMap.has(node.regionId)) {
        return err(
          new DomainError(
            "REFERENCE_NOT_FOUND",
            "World node references a missing region",
            { nodeId: node.id, regionId: node.regionId }
          )
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

      if (!regionMap.has(road.regionId)) {
        return err(
          new DomainError(
            "REFERENCE_NOT_FOUND",
            "Road references a missing region",
            { roadId: road.id, regionId: road.regionId }
          )
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

    return ok(new WorldGraph(regionMap, nodeMap, roadMap));
  }

  getRegion(id: RegionId): Region | undefined {
    return this.regions.get(id);
  }

  getNode(id: WorldNodeId): WorldNode | undefined {
    return this.nodes.get(id);
  }

  getRoad(id: RoadSegmentId): RoadSegment | undefined {
    return this.roads.get(id);
  }

  outgoingFrom(nodeId: WorldNodeId): readonly RoadTraversal[] {
    return this.adjacency.get(nodeId) ?? [];
  }

  allRegions(): readonly Region[] {
    return [...this.regions.values()];
  }

  allNodes(): readonly WorldNode[] {
    return [...this.nodes.values()];
  }

  allRoads(): readonly RoadSegment[] {
    return [...this.roads.values()];
  }
}

function buildAdjacency(
  nodes: ReadonlyMap<WorldNodeId, WorldNode>,
  roads: ReadonlyMap<RoadSegmentId, RoadSegment>
): ReadonlyMap<WorldNodeId, readonly RoadTraversal[]> {
  const adjacency = new Map<WorldNodeId, RoadTraversal[]>();

  for (const nodeId of nodes.keys()) {
    adjacency.set(nodeId, []);
  }

  for (const road of roads.values()) {
    if (!road.active) continue;

    if (road.direction === "forward" || road.direction === "both") {
      adjacency.get(road.fromNodeId)?.push({
        roadSegmentId: road.id,
        fromNodeId: road.fromNodeId,
        toNodeId: road.toNodeId,
        direction: "forward"
      });
    }

    if (road.direction === "reverse" || road.direction === "both") {
      adjacency.get(road.toNodeId)?.push({
        roadSegmentId: road.id,
        fromNodeId: road.toNodeId,
        toNodeId: road.fromNodeId,
        direction: "reverse"
      });
    }
  }

  for (const edges of adjacency.values()) {
    edges.sort((a, b) =>
      String(a.roadSegmentId).localeCompare(String(b.roadSegmentId))
    );
  }

  return adjacency;
}
