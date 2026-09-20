import type {
  GameSecond
} from "../../core/units/Units.js";
import type {
  StationId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { Driver } from "./Driver.js";

export function validateDriverQualification(
  driver: Driver,
  requiredVehicleClass: string
): Result<true, DomainError> {
  if (
    driver.status === "suspended" ||
    driver.status === "off_duty"
  ) {
    return err(
      new DomainError(
        "DRIVER_NOT_AVAILABLE",
        "Driver cannot be reserved in the current state",
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

  return ok(true);
}

export function beginDriverBoarding(
  driver: Driver,
  tripId: TripId,
  originStationId: StationId,
  gameSecond: GameSecond,
  minimumRestSeconds: number
): Result<Driver, DomainError> {
  if (
    driver.status !== "available" ||
    driver.activeTripId !== null ||
    driver.activeFleetTaskId !== null
  ) {
    return err(
      new DomainError(
        "DRIVER_NOT_AVAILABLE",
        "Driver is not physically available for boarding",
        { driverId: driver.id, status: driver.status }
      )
    );
  }

  if (
    driver.currentStationId !== originStationId ||
    Number(driver.availableAtGameSecond) > Number(gameSecond)
  ) {
    return err(
      new DomainError(
        "RESOURCE_LOCATION_MISMATCH",
        "Driver is not at the trip origin or is still unavailable",
        {
          driverId: driver.id,
          currentStationId: driver.currentStationId,
          originStationId
        }
      )
    );
  }

  const rested =
    driver.lastDutyEndedAtGameSecond === null ||
    Number(gameSecond) - Number(driver.lastDutyEndedAtGameSecond) >=
      minimumRestSeconds;

  return ok({
    ...driver,
    status: "assigned",
    activeTripId: tripId,
    dutyStartedAtGameSecond:
      rested || driver.dutyStartedAtGameSecond === null
        ? gameSecond
        : driver.dutyStartedAtGameSecond,
    continuousDrivingSeconds: rested
      ? 0
      : driver.continuousDrivingSeconds
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
    status: "driving",
    currentStationId: null
  });
}

export function releaseDriverFromTrip(
  driver: Driver,
  tripId: TripId,
  stationId: StationId | null = driver.currentStationId,
  availableAtGameSecond: GameSecond = driver.availableAtGameSecond,
  drivingSeconds = 0,
  dutyEndedAtGameSecond: GameSecond = availableAtGameSecond
): Driver {
  if (driver.activeTripId !== tripId) return driver;

  return {
    ...driver,
    status: "available",
    activeTripId: null,
    currentStationId: stationId,
    availableAtGameSecond,
    lastDutyEndedAtGameSecond: dutyEndedAtGameSecond,
    continuousDrivingSeconds:
      driver.continuousDrivingSeconds + Math.max(0, drivingSeconds)
  };
}
