import type { StationId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { RouteStopPoint } from "../../domain/route/RouteStopPoint.js";
import { findPath } from "../../domain/world/PathFinder.js";
import type { PathLeg } from "../../domain/world/RoadPath.js";
import type { RoutingPreference } from "../../domain/world/RoutingCost.js";
import { WorldRuntimeState } from "../../domain/world/WorldRuntimeState.js";
import type { StationRepository } from "../repositories/StationRepository.js";
import type { WorldRepository } from "../repositories/WorldRepository.js";

export interface BuiltRoutePath {
  readonly legs: readonly PathLeg[];
  readonly stopPoints: readonly RouteStopPoint[];
}

export function buildOfficialRoutePath(
  stationIds: readonly StationId[],
  preference: RoutingPreference,
  stations: StationRepository,
  worldRepository: WorldRepository
): Result<BuiltRoutePath, DomainError> {
  if (stationIds.length < 2) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Route path requires at least two stations"
      )
    );
  }

  if (new Set(stationIds).size !== stationIds.length) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Route path cannot contain duplicate stations"
      )
    );
  }

  const stationList = stationIds.map((stationId) => {
    const station = stations.getById(stationId);
    return { stationId, station };
  });

  for (const entry of stationList) {
    if (!entry.station) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Route references a missing station",
          { stationId: entry.stationId }
        )
      );
    }

    if (entry.station.status !== "active") {
      return err(
        new DomainError(
          "ENTITY_INACTIVE",
          "Route references a closed station",
          { stationId: entry.stationId }
        )
      );
    }
  }

  const graph = worldRepository.get();
  const staticRoutingState = new WorldRuntimeState();
  const legs: PathLeg[] = [];
  const stopPoints: RouteStopPoint[] = [
    {
      stationId: stationIds[0]!,
      pathLegBoundaryIndex: 0
    }
  ];

  for (let index = 0; index < stationList.length - 1; index += 1) {
    const from = stationList[index]?.station;
    const to = stationList[index + 1]?.station;

    if (!from || !to) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Route station sequence is invalid"
        )
      );
    }

    if (!graph.getNode(from.worldNodeId) || !graph.getNode(to.worldNodeId)) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Station references a missing world node",
          {
            fromStationId: from.id,
            toStationId: to.id
          }
        )
      );
    }

    if (from.worldNodeId === to.worldNodeId) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Two route stations cannot share the same world node",
          {
            fromStationId: from.id,
            toStationId: to.id
          }
        )
      );
    }

    const path = findPath(
      graph,
      staticRoutingState,
      from.worldNodeId,
      to.worldNodeId,
      preference
    );
    if (!path.ok) return path;

    if (path.value.legs.length === 0) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Route segment between stations has no road path",
          {
            fromStationId: from.id,
            toStationId: to.id
          }
        )
      );
    }

    legs.push(...path.value.legs);
    stopPoints.push({
      stationId: to.id,
      pathLegBoundaryIndex: legs.length
    });
  }

  return ok({ legs, stopPoints });
}
