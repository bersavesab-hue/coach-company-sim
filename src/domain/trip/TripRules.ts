import type {
  RouteId,
  ServicePlanId,
  StaffId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
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
    onboardPassengerCount: 0,
    delaySeconds: units.gameSecond(0)
  });
}

export function assignVehicleToTrip(
  trip: TripInstance,
  vehicleId: VehicleId
): Result<TripInstance, DomainError> {
  if (trip.status !== "planned") {
    return err(
      new DomainError(
        "TRIP_NOT_PLANNED",
        "Vehicle can only be assigned to a planned trip",
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

  return ok({
    ...trip,
    vehicleId
  });
}

export function assignDriverToTrip(
  trip: TripInstance,
  driverId: StaffId
): Result<TripInstance, DomainError> {
  if (trip.status !== "planned") {
    return err(
      new DomainError(
        "TRIP_NOT_PLANNED",
        "Driver can only be assigned to a planned trip",
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

  return ok({
    ...trip,
    driverId
  });
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
