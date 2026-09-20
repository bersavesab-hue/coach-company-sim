import type {
  RouteId,
  ServicePlanId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { PassengerRoute } from "../route/PassengerRoute.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";
import { transitionTrip } from "./TripStateMachine.js";
import type { TripInstance } from "./TripInstance.js";

export interface PrepareTripInput {
  readonly id: TripId;
  readonly routeId: RouteId;
  readonly servicePlanId: ServicePlanId;
  readonly plannedDepartureGameSecond: GameSecond;
  readonly createdAtGameSecond: GameSecond;
}

export function prepareTrip(
  input: PrepareTripInput
): Result<TripInstance, DomainError> {
  if (
    Number(input.plannedDepartureGameSecond) <
    Number(input.createdAtGameSecond)
  ) {
    return err(
      new DomainError(
        "DEPARTURE_SLOT_INVALID",
        "Cannot prepare a trip for a past departure slot"
      )
    );
  }

  return ok({
    id: input.id,
    routeId: input.routeId,
    servicePlanId: input.servicePlanId,
    vehicleId: null,
    driverId: null,
    status: "planned",
    plannedDepartureGameSecond: input.plannedDepartureGameSecond,
    actualDepartureGameSecond: null,
    actualArrivalGameSecond: null,
    position: {
      activeRoadSegmentIndex: 0,
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: input.createdAtGameSecond
    },
    onboardPassengerGroups: [],
    recoveryStationId: null,
    delaySeconds: units.gameSecond(0)
  });
}

export function assignVehicleToTrip(
  trip: TripInstance,
  vehicleId: VehicleId
): Result<TripInstance, DomainError> {
  if (trip.status !== "planned" && trip.status !== "disrupted") {
    return err(
      new DomainError(
        "TRIP_NOT_PLANNED",
        "Vehicle can only be assigned to a planned or disrupted trip",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  if (trip.vehicleId !== null) {
    return err(
      new DomainError(
        "VEHICLE_ALREADY_ASSIGNED",
        "Trip already has a vehicle",
        { tripId: trip.id, vehicleId: trip.vehicleId }
      )
    );
  }

  return ok({ ...trip, vehicleId });
}

export function assignDriverToTrip(
  trip: TripInstance,
  driverId: StaffId
): Result<TripInstance, DomainError> {
  if (trip.status !== "planned" && trip.status !== "disrupted") {
    return err(
      new DomainError(
        "TRIP_NOT_PLANNED",
        "Driver can only be assigned to a planned or disrupted trip",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  if (trip.driverId !== null) {
    return err(
      new DomainError(
        "DRIVER_NOT_AVAILABLE",
        "Trip already has a driver",
        { tripId: trip.id, driverId: trip.driverId }
      )
    );
  }

  return ok({ ...trip, driverId });
}

export function startTripBoarding(
  trip: TripInstance
): Result<TripInstance, DomainError> {
  if (trip.vehicleId === null || trip.driverId === null) {
    return err(
      new DomainError(
        "TRIP_RESOURCE_NOT_ASSIGNED",
        "Trip requires both vehicle and driver before boarding",
        { tripId: trip.id }
      )
    );
  }

  return transitionTrip(trip, "boarding");
}

export function departTrip(
  trip: TripInstance,
  actualDepartureGameSecond: GameSecond
): Result<TripInstance, DomainError> {
  if (trip.status !== "boarding") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only a boarding trip can depart",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  const transitioned = transitionTrip(trip, "running");
  if (!transitioned.ok) return transitioned;

  const delay = Math.max(
    0,
    Number(actualDepartureGameSecond) -
      Number(trip.plannedDepartureGameSecond)
  );

  return ok({
    ...transitioned.value,
    actualDepartureGameSecond,
    delaySeconds: units.gameSecond(delay),
    position: {
      ...transitioned.value.position,
      lastUpdatedGameSecond: actualDepartureGameSecond
    }
  });
}

export function completeTrip(
  trip: TripInstance,
  actualArrivalGameSecond: GameSecond,
  finalRoadSegmentIndex: number,
  finalOffsetOnSegmentM: number
): Result<TripInstance, DomainError> {
  if (trip.status !== "running") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only a running trip can complete",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  const transitioned = transitionTrip(trip, "completed");
  if (!transitioned.ok) return transitioned;

  return ok({
    ...transitioned.value,
    actualArrivalGameSecond,
    position: {
      activeRoadSegmentIndex: finalRoadSegmentIndex,
      offsetOnSegmentM: units.distanceM(finalOffsetOnSegmentM),
      lastUpdatedGameSecond: actualArrivalGameSecond
    }
  });
}

export function disruptTrip(
  trip: TripInstance
): Result<TripInstance, DomainError> {
  if (trip.status !== "running") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only a running trip can be disrupted",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  return transitionTrip(trip, "disrupted");
}

export function recoverDisruptedTripToStop(
  trip: TripInstance,
  route: PassengerRoute,
  stationId: StationId,
  gameSecond: GameSecond
): Result<TripInstance, DomainError> {
  if (trip.status !== "disrupted") {
    return err(
      new DomainError(
        "TRIP_NOT_DISRUPTED",
        "Only a disrupted trip can be recovered",
        { tripId: trip.id, status: trip.status }
      )
    );
  }

  const stop = route.stopPoints.find(
    (item) => item.stationId === stationId
  );
  if (!stop) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Recovery station is not on the route",
        { tripId: trip.id, stationId }
      )
    );
  }

  return ok({
    ...trip,
    vehicleId: null,
    driverId: null,
    recoveryStationId: stationId,
    position: {
      activeRoadSegmentIndex: Math.min(
        stop.pathLegBoundaryIndex,
        Math.max(0, route.pathLegs.length - 1)
      ),
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: gameSecond
    }
  });
}

export function resumeDisruptedTrip(
  trip: TripInstance,
  gameSecond: GameSecond
): Result<TripInstance, DomainError> {
  if (
    trip.status !== "disrupted" ||
    trip.vehicleId === null ||
    trip.driverId === null
  ) {
    return err(
      new DomainError(
        "TRIP_NOT_DISRUPTED",
        "Trip must be disrupted with replacement resources before resume",
        { tripId: trip.id }
      )
    );
  }

  const transitioned = transitionTrip(trip, "running");
  if (!transitioned.ok) return transitioned;

  return ok({
    ...transitioned.value,
    recoveryStationId: null,
    position: {
      ...transitioned.value.position,
      lastUpdatedGameSecond: gameSecond
    }
  });
}

export function cancelTrip(
  trip: TripInstance
): Result<TripInstance, DomainError> {
  if (trip.status === "completed") {
    return err(
      new DomainError(
        "TRIP_ALREADY_COMPLETED",
        "Completed trip cannot be cancelled",
        { tripId: trip.id }
      )
    );
  }

  if (trip.status === "cancelled") {
    return err(
      new DomainError(
        "TRIP_ALREADY_CANCELLED",
        "Trip is already cancelled",
        { tripId: trip.id }
      )
    );
  }

  return transitionTrip(trip, "cancelled");
}
