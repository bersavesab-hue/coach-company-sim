import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { PassengerRuntimeState } from "../../domain/passenger/PassengerRuntimeState.js";
import type { OnboardPassengerGroup } from "../../domain/passenger/OnboardPassengerGroup.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";

export interface PassengerStopFlowResult {
  readonly trip: TripInstance;
  readonly boardedCount: number;
  readonly alightedCount: number;
  readonly boardedGroups: readonly OnboardPassengerGroup[];
  readonly alightedGroups: readonly OnboardPassengerGroup[];
  readonly leftWaitingCount: number;
}

export function totalOnboardPassengers(trip: TripInstance): number {
  return trip.onboardPassengerGroups.reduce(
    (sum, group) => sum + group.count,
    0
  );
}

export function serveRouteStop(
  trip: TripInstance,
  route: PassengerRoute,
  stopIndex: number,
  seatCapacity: number,
  runtime: PassengerRuntimeState
): PassengerStopFlowResult {
  if (!Number.isSafeInteger(seatCapacity) || seatCapacity <= 0) {
    throw new Error("seatCapacity must be a positive safe integer");
  }

  const stop = route.stopPoints[stopIndex];
  if (!stop) {
    throw new Error("Route stop index is out of range");
  }

  const alightedGroups = trip.onboardPassengerGroups.filter(
    (group) => group.destinationStationId === stop.stationId
  );
  const alightedCount = alightedGroups.reduce(
    (sum, group) => sum + group.count,
    0
  );

  const groupMap = new Map<StationId, number>();
  for (const group of trip.onboardPassengerGroups) {
    if (group.destinationStationId === stop.stationId) continue;
    groupMap.set(
      group.destinationStationId,
      (groupMap.get(group.destinationStationId) ?? 0) + group.count
    );
  }

  let availableSeats =
    seatCapacity -
    [...groupMap.values()].reduce((sum, count) => sum + count, 0);

  const boardedGroups: OnboardPassengerGroup[] = [];
  let boardedCount = 0;
  let leftWaitingCount = 0;

  for (let index = stopIndex + 1; index < route.stopPoints.length; index += 1) {
    const destination = route.stopPoints[index]!.stationId;
    const waiting = runtime.waitingCount(stop.stationId, destination);
    const boarding = Math.min(waiting, Math.max(0, availableSeats));

    if (boarding > 0) {
      runtime.takeWaiting(stop.stationId, destination, boarding);
      groupMap.set(
        destination,
        (groupMap.get(destination) ?? 0) + boarding
      );
      boardedGroups.push({
        destinationStationId: destination,
        count: boarding
      });
      boardedCount += boarding;
      availableSeats -= boarding;
    }

    leftWaitingCount += runtime.waitingCount(
      stop.stationId,
      destination
    );
  }

  const groups = route.stopPoints
    .slice(stopIndex + 1)
    .map((point) => ({
      destinationStationId: point.stationId,
      count: groupMap.get(point.stationId) ?? 0
    }))
    .filter((group) => group.count > 0);

  return {
    trip: {
      ...trip,
      onboardPassengerGroups: groups
    },
    boardedCount,
    alightedCount,
    boardedGroups,
    alightedGroups,
    leftWaitingCount
  };
}
