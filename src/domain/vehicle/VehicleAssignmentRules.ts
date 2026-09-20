import type {
  GameSecond
} from "../../core/units/Units.js";
import type {
  StationId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { OwnedVehicle } from "./OwnedVehicle.js";
import type { VehicleModel } from "./VehicleModel.js";

export function validateVehicleQualification(
  vehicle: OwnedVehicle,
  model: VehicleModel,
  requiredVehicleClass: string
): Result<true, DomainError> {
  if (!model.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle model is inactive",
        { vehicleModelId: model.id }
      )
    );
  }

  if (
    vehicle.status === "sold" ||
    vehicle.status === "retired" ||
    vehicle.status === "maintenance"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle cannot be reserved in its current state",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  if (model.serviceClass !== requiredVehicleClass) {
    return err(
      new DomainError(
        "VEHICLE_CLASS_MISMATCH",
        "Vehicle class does not satisfy the service plan",
        {
          vehicleId: vehicle.id,
          vehicleClass: model.serviceClass,
          requiredVehicleClass
        }
      )
    );
  }

  return ok(true);
}

export function beginVehicleBoarding(
  vehicle: OwnedVehicle,
  tripId: TripId,
  originStationId: StationId,
  gameSecond: GameSecond
): Result<OwnedVehicle, DomainError> {
  if (
    vehicle.status !== "available" ||
    vehicle.activeTripId !== null ||
    vehicle.activeFleetTaskId !== null
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle is not physically available for boarding",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  if (
    vehicle.currentStationId !== originStationId ||
    Number(vehicle.availableAtGameSecond) > Number(gameSecond)
  ) {
    return err(
      new DomainError(
        "RESOURCE_LOCATION_MISMATCH",
        "Vehicle is not at the trip origin or is still in turnaround",
        {
          vehicleId: vehicle.id,
          currentStationId: vehicle.currentStationId,
          originStationId,
          availableAtGameSecond: vehicle.availableAtGameSecond
        }
      )
    );
  }

  return ok({
    ...vehicle,
    status: "assigned",
    activeTripId: tripId
  });
}

export function startVehicleTrip(
  vehicle: OwnedVehicle,
  tripId: TripId
): Result<OwnedVehicle, DomainError> {
  if (
    vehicle.status !== "assigned" ||
    vehicle.activeTripId !== tripId
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle is not assigned to this trip",
        { vehicleId: vehicle.id, tripId }
      )
    );
  }

  return ok({
    ...vehicle,
    status: "running",
    currentStationId: null
  });
}

export function releaseVehicleFromTrip(
  vehicle: OwnedVehicle,
  tripId: TripId,
  stationId: StationId | null = vehicle.currentStationId,
  availableAtGameSecond: GameSecond = vehicle.availableAtGameSecond
): OwnedVehicle {
  if (vehicle.activeTripId !== tripId) return vehicle;

  const releasableStatus =
    vehicle.status === "assigned" || vehicle.status === "running";

  return {
    ...vehicle,
    status: releasableStatus ? "available" : vehicle.status,
    activeTripId: null,
    currentStationId: stationId,
    availableAtGameSecond
  };
}
