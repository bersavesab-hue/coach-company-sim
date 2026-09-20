import type { TripId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { OwnedVehicle } from "./OwnedVehicle.js";
import type { VehicleModel } from "./VehicleModel.js";

export function reserveVehicleForTrip(
  vehicle: OwnedVehicle,
  model: VehicleModel,
  tripId: TripId,
  requiredVehicleClass: string
): Result<OwnedVehicle, DomainError> {
  if (!model.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle model is inactive",
        { vehicleModelId: model.id }
      )
    );
  }

  if (vehicle.status !== "available" || vehicle.activeTripId !== null) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle is not available for assignment",
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
    status: "running"
  });
}

export function releaseVehicleFromTrip(
  vehicle: OwnedVehicle,
  tripId: TripId
): OwnedVehicle {
  if (vehicle.activeTripId !== tripId) return vehicle;

  const releasableStatus =
    vehicle.status === "assigned" || vehicle.status === "running";

  return {
    ...vehicle,
    status: releasableStatus ? "available" : vehicle.status,
    activeTripId: null
  };
}
