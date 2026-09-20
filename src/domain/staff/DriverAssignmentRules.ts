import type { TripId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { Driver } from "./Driver.js";

export function reserveDriverForTrip(
  driver: Driver,
  tripId: TripId,
  requiredVehicleClass: string
): Result<Driver, DomainError> {
  if (driver.status !== "available" || driver.activeTripId !== null) {
    return err(
      new DomainError(
        "DRIVER_NOT_AVAILABLE",
        "Driver is not available for assignment",
        { driverId: driver.id, status: driver.status }
      )
    );
  }

  if (!driver.qualifiedVehicleClasses.includes(requiredVehicleClass)) {
    return err(
      new DomainError(
        "DRIVER_NOT_QUALIFIED",
        "Driver lacks the required vehicle-class qualification",
        {
          driverId: driver.id,
          requiredVehicleClass
        }
      )
    );
  }

  return ok({
    ...driver,
    status: "assigned",
    activeTripId: tripId
  });
}

export function startDriverTrip(
  driver: Driver,
  tripId: TripId
): Result<Driver, DomainError> {
  if (
    driver.status !== "assigned" ||
    driver.activeTripId !== tripId
  ) {
    return err(
      new DomainError(
        "DRIVER_NOT_AVAILABLE",
        "Driver is not assigned to this trip",
        { driverId: driver.id, tripId }
      )
    );
  }

  return ok({
    ...driver,
    status: "driving"
  });
}

export function releaseDriverFromTrip(
  driver: Driver,
  tripId: TripId
): Driver {
  if (driver.activeTripId !== tripId) return driver;

  return {
    ...driver,
    status: "available",
    activeTripId: null
  };
}
