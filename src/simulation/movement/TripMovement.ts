import type {
  RoadSegmentId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import { completeTrip } from "../../domain/trip/TripRules.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";
import type { WorldRuntimeState } from "../../domain/world/WorldRuntimeState.js";

export interface ReachedPathBoundary {
  readonly pathLegBoundaryIndex: number;
  readonly gameSecond: GameSecond;
}

export interface RoadUsage {
  readonly roadSegmentId: RoadSegmentId;
  readonly distanceM: number;
}

export interface TripMovementResult {
  readonly trip: TripInstance;
  readonly completed: boolean;
  readonly completionGameSecond: GameSecond | null;
  readonly blockedRoadSegmentId: RoadSegmentId | null;
  readonly reachedBoundaries: readonly ReachedPathBoundary[];
  readonly roadUsage: readonly RoadUsage[];
  readonly distanceTraveledM: number;
  readonly movingSeconds: number;
  readonly idleSeconds: number;
}

export function effectiveRoadSpeedMps(
  vehicleModel: VehicleModel,
  roadSpeedLimitMps: number,
  speedMultiplierPermille: number
): number {
  const adjustedRoadSpeed = Math.floor(
    (roadSpeedLimitMps * speedMultiplierPermille) / 1000
  );

  return Math.max(
    0,
    Math.min(Number(vehicleModel.maxSpeedMps), adjustedRoadSpeed)
  );
}

export function advanceRunningTrip(
  trip: TripInstance,
  route: PassengerRoute,
  vehicleModel: VehicleModel,
  graph: WorldGraph,
  runtime: WorldRuntimeState,
  targetGameSecond: GameSecond
): Result<TripMovementResult, DomainError> {
  if (trip.status !== "running") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only running trips can be advanced",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  if (route.id !== trip.routeId) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Trip route does not match supplied route",
        { tripId: trip.id, routeId: route.id }
      )
    );
  }

  const target = Number(targetGameSecond);
  let currentTime = Number(trip.position.lastUpdatedGameSecond);

  if (target < currentTime) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Cannot move a trip backward in game time",
        { tripId: trip.id, currentTime, target }
      )
    );
  }

  if (route.pathLegs.length === 0) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Running trip route has no road path",
        { routeId: route.id }
      )
    );
  }

  let legIndex = trip.position.activeRoadSegmentIndex;
  let offsetM = Number(trip.position.offsetOnSegmentM);
  const reachedBoundaries: ReachedPathBoundary[] = [];
  const usage = new Map<RoadSegmentId, number>();
  let movingSeconds = 0;
  let idleSeconds = 0;
  let distanceTraveledM = 0;

  const addUsage = (roadSegmentId: RoadSegmentId, distanceM: number) => {
    if (distanceM <= 0) return;
    usage.set(
      roadSegmentId,
      (usage.get(roadSegmentId) ?? 0) + distanceM
    );
    distanceTraveledM += distanceM;
  };

  while (currentTime < target) {
    const leg = route.pathLegs[legIndex];
    if (!leg) break;

    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Route path references a missing road segment",
          { routeId: route.id, roadSegmentId: leg.roadSegmentId }
        )
      );
    }

    if (
      leg.fromNodeId !==
        (leg.direction === "forward" ? road.fromNodeId : road.toNodeId) ||
      leg.toNodeId !==
        (leg.direction === "forward" ? road.toNodeId : road.fromNodeId)
    ) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Route PathLeg direction no longer matches WorldGraph",
          { routeId: route.id, roadSegmentId: road.id }
        )
      );
    }

    const roadState = runtime.getRoadState(road.id);

    if (roadState.status === "closed") {
      idleSeconds += target - currentTime;
      currentTime = target;
      return movementResult(
        withPosition(trip, legIndex, offsetM, targetGameSecond),
        false,
        null,
        road.id,
        reachedBoundaries,
        usage,
        distanceTraveledM,
        movingSeconds,
        idleSeconds
      );
    }

    const speedMps = effectiveRoadSpeedMps(
      vehicleModel,
      Number(road.speedLimitMps),
      Number(roadState.speedMultiplierPermille)
    );

    if (speedMps <= 0) {
      idleSeconds += target - currentTime;
      currentTime = target;
      return movementResult(
        withPosition(trip, legIndex, offsetM, targetGameSecond),
        false,
        null,
        road.id,
        reachedBoundaries,
        usage,
        distanceTraveledM,
        movingSeconds,
        idleSeconds
      );
    }

    const roadLengthM = Number(road.lengthM);
    const remainingM = Math.max(0, roadLengthM - offsetM);

    if (remainingM === 0) {
      legIndex += 1;
      offsetM = 0;
      continue;
    }

    const availableSeconds = target - currentTime;
    const secondsToFinish = Math.ceil(remainingM / speedMps);

    if (secondsToFinish > availableSeconds) {
      const movedDistance = speedMps * availableSeconds;
      offsetM += movedDistance;
      addUsage(road.id, movedDistance);
      movingSeconds += availableSeconds;
      currentTime = target;
      break;
    }

    addUsage(road.id, remainingM);
    movingSeconds += secondsToFinish;
    currentTime += secondsToFinish;
    legIndex += 1;
    offsetM = 0;

    reachedBoundaries.push({
      pathLegBoundaryIndex: legIndex,
      gameSecond: units.gameSecond(currentTime)
    });

    if (legIndex >= route.pathLegs.length) {
      const completed = completeTrip(
        trip,
        units.gameSecond(currentTime),
        route.pathLegs.length - 1,
        roadLengthM
      );
      if (!completed.ok) return completed;

      return movementResult(
        completed.value,
        true,
        units.gameSecond(currentTime),
        null,
        reachedBoundaries,
        usage,
        distanceTraveledM,
        movingSeconds,
        idleSeconds
      );
    }
  }

  return movementResult(
    withPosition(trip, legIndex, offsetM, targetGameSecond),
    false,
    null,
    null,
    reachedBoundaries,
    usage,
    distanceTraveledM,
    movingSeconds,
    idleSeconds
  );
}

function movementResult(
  trip: TripInstance,
  completed: boolean,
  completionGameSecond: GameSecond | null,
  blockedRoadSegmentId: RoadSegmentId | null,
  reachedBoundaries: readonly ReachedPathBoundary[],
  usage: ReadonlyMap<RoadSegmentId, number>,
  distanceTraveledM: number,
  movingSeconds: number,
  idleSeconds: number
): TripMovementResult {
  return {
    trip,
    completed,
    completionGameSecond,
    blockedRoadSegmentId,
    reachedBoundaries,
    roadUsage: [...usage.entries()].map(
      ([roadSegmentId, distanceM]) => ({
        roadSegmentId,
        distanceM
      })
    ),
    distanceTraveledM,
    movingSeconds,
    idleSeconds
  };
}

function withPosition(
  trip: TripInstance,
  activeRoadSegmentIndex: number,
  offsetOnSegmentM: number,
  lastUpdatedGameSecond: GameSecond
): TripInstance {
  return {
    ...trip,
    position: {
      activeRoadSegmentIndex,
      offsetOnSegmentM: units.distanceM(offsetOnSegmentM),
      lastUpdatedGameSecond
    }
  };
}
