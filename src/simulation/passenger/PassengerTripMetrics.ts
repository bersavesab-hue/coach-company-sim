import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { OnboardPassengerGroup } from "../../domain/passenger/OnboardPassengerGroup.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";

export function recordPassengerBoardingMetrics(
  trip: TripInstance,
  route: PassengerRoute,
  originStationId: StationId,
  boardedGroups: readonly OnboardPassengerGroup[],
  world: WorldGraph
): TripInstance {
  const boarded = boardedGroups.reduce(
    (sum, group) => sum + group.count,
    0
  );
  if (boarded <= 0) return trip;

  let passengerDistanceM = 0;
  for (const group of boardedGroups) {
    passengerDistanceM +=
      routeOdDistanceM(
        route,
        originStationId,
        group.destinationStationId,
        world
      ) * group.count;
  }

  return {
    ...trip,
    boardedPassengerCountTotal:
      (trip.boardedPassengerCountTotal ?? 0) + boarded,
    passengerDistanceMTotal:
      (trip.passengerDistanceMTotal ?? 0) +
      passengerDistanceM
  };
}

export function routeOdDistanceM(
  route: PassengerRoute,
  originStationId: StationId,
  destinationStationId: StationId,
  world: WorldGraph
): number {
  const originIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === originStationId
  );
  const destinationIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === destinationStationId
  );
  if (originIndex < 0 || destinationIndex <= originIndex) {
    return 0;
  }

  const fromBoundary =
    route.stopPoints[originIndex]!.pathLegBoundaryIndex;
  const toBoundary =
    route.stopPoints[destinationIndex]!.pathLegBoundaryIndex;

  let distanceM = 0;
  for (let index = fromBoundary; index < toBoundary; index += 1) {
    const leg = route.pathLegs[index];
    if (!leg) break;
    const road = world.getRoad(leg.roadSegmentId);
    if (road) distanceM += Number(road.lengthM);
  }
  return distanceM;
}
