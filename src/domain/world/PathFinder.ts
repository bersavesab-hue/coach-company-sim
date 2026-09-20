import type {
  RoadSegmentId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { RoadTraversal, TraversalDirection } from "./RoadTraversal.js";
import { routingCost, type RoutingPreference } from "./RoutingCost.js";
import type { WorldGraph } from "./WorldGraph.js";
import type { WorldRuntimeState } from "./WorldRuntimeState.js";

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

interface PreviousStep {
  readonly previousNodeId: WorldNodeId;
  readonly traversal: RoadTraversal;
}

export function findPath(
  graph: WorldGraph,
  runtime: WorldRuntimeState,
  fromNodeId: WorldNodeId,
  toNodeId: WorldNodeId,
  preference: RoutingPreference
): Result<RoadPath, DomainError> {
  if (!graph.getNode(fromNodeId) || !graph.getNode(toNodeId)) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Path endpoint does not exist in WorldGraph",
        { fromNodeId, toNodeId }
      )
    );
  }

  if (fromNodeId === toNodeId) {
    return ok({
      fromNodeId,
      toNodeId,
      preference,
      totalCost: 0,
      legs: []
    });
  }

  const distance = new Map<WorldNodeId, number>();
  const previous = new Map<WorldNodeId, PreviousStep>();
  const visited = new Set<WorldNodeId>();

  distance.set(fromNodeId, 0);

  while (true) {
    const current = nearestUnvisited(distance, visited);
    if (current === null) break;
    if (current === toNodeId) break;

    visited.add(current);
    const currentCost = distance.get(current);
    if (currentCost === undefined) break;

    for (const traversal of graph.outgoingFrom(current)) {
      const road = graph.getRoad(traversal.roadSegmentId);
      if (!road) continue;

      const cost = routingCost(
        road,
        runtime.getRoadState(road.id),
        preference
      );

      if (cost === null) continue;

      const candidate = currentCost + cost;
      const existing = distance.get(traversal.toNodeId);

      if (
        existing === undefined ||
        candidate < existing ||
        (candidate === existing &&
          isDeterministicallyEarlier(
            traversal,
            previous.get(traversal.toNodeId)?.traversal
          ))
      ) {
        distance.set(traversal.toNodeId, candidate);
        previous.set(traversal.toNodeId, {
          previousNodeId: current,
          traversal
        });
      }
    }
  }

  const totalCost = distance.get(toNodeId);
  if (totalCost === undefined) {
    return err(
      new DomainError(
        "PATH_NOT_FOUND",
        "No traversable road path found",
        { fromNodeId, toNodeId, preference }
      )
    );
  }

  const legs: PathLeg[] = [];
  let cursor = toNodeId;

  while (cursor !== fromNodeId) {
    const step = previous.get(cursor);
    if (!step) {
      return err(
        new DomainError(
          "PATH_NOT_FOUND",
          "Path reconstruction failed",
          { fromNodeId, toNodeId, cursor }
        )
      );
    }

    legs.push({
      roadSegmentId: step.traversal.roadSegmentId,
      direction: step.traversal.direction,
      fromNodeId: step.traversal.fromNodeId,
      toNodeId: step.traversal.toNodeId
    });

    cursor = step.previousNodeId;
  }

  legs.reverse();

  return ok({
    fromNodeId,
    toNodeId,
    preference,
    totalCost,
    legs
  });
}

function nearestUnvisited(
  distance: ReadonlyMap<WorldNodeId, number>,
  visited: ReadonlySet<WorldNodeId>
): WorldNodeId | null {
  let bestNode: WorldNodeId | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (const [nodeId, cost] of distance) {
    if (visited.has(nodeId)) continue;

    if (
      cost < bestCost ||
      (cost === bestCost &&
        (bestNode === null || String(nodeId) < String(bestNode)))
    ) {
      bestNode = nodeId;
      bestCost = cost;
    }
  }

  return bestNode;
}

function isDeterministicallyEarlier(
  candidate: RoadTraversal,
  existing: RoadTraversal | undefined
): boolean {
  if (!existing) return true;

  const candidateKey =
    String(candidate.roadSegmentId) + ":" + candidate.direction;
  const existingKey =
    String(existing.roadSegmentId) + ":" + existing.direction;

  return candidateKey < existingKey;
}
