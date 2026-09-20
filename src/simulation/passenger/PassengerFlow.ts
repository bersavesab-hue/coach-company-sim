import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { PassengerRuntimeState } from "../../domain/passenger/PassengerRuntimeState.js";

export interface PassengerStopFlowResult {
  readonly trip: TripInstance;
  readonly boardedCount: number;
  readonly alightedCount: number;
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

  const remainingGroups = trip.onboardPassengerGroups.filter(
    (group) => group.destinationStationId !== stop.stationId
  );
  const alightedCount =
    totalOnboardPassengers(trip) -
    remainingGroups.reduce((sum, group) => sum + group.count, 0);

  let availableSeats =
    seatCapacity -
    remainingGroups.reduce((sum, group) => sum + group.count, 0);

  const groups = [...remainingGroups];
  let boardedCount = 0;
  let leftWaitingCount = 0;

  for (let index = stopIndex + 1; index < route.stopPoints.length; index += 1) {
    const destination = route.stopPoints[index]!.stationId;
    const waiting = runtime.waitingCount(stop.stationId, destination);
    const boarding = Math.min(waiting, Math.max(0, availableSeats));

    if (boarding > 0) {
      runtime.takeWaiting(stop.stationId, destination, boarding);
      groups.push({
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

  return {
    trip: {
      ...trip,
      onboardPassengerGroups: groups
    },
    boardedCount,
    alightedCount,
    leftWaitingCount
  };
}
