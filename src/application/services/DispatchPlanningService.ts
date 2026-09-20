import type {
  StaffId,
  StationId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { Driver } from "../../domain/staff/Driver.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { estimateTripWindow } from "./TripTiming.js";

interface Reservation {
  readonly trip: TripInstance;
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly start: number;
  readonly end: number;
  readonly drivingSeconds: number;
}

export class DispatchPlanningService {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly policy: OperationsPolicy
  ) {}

  validateVehicleReservation(
    trip: TripInstance,
    vehicle: OwnedVehicle,
    model: VehicleModel
  ): Result<true, DomainError> {
    const candidate = this.buildReservation(trip, model);
    if (!candidate.ok) return candidate;

    const reservations: Reservation[] = [];
    for (const other of this.repositories.trips.findByVehicle(vehicle.id)) {
      if (
        other.id === trip.id ||
        other.status === "cancelled" ||
        other.status === "completed"
      ) continue;
      const built = this.buildReservation(other, model);
      if (built.ok) reservations.push(built.value);
    }
    reservations.push(candidate.value);
    reservations.sort((a, b) => a.start - b.start);

    const candidateIndex = reservations.findIndex(
      (item) => item.trip.id === trip.id
    );

    const previous = reservations[candidateIndex - 1];
    const next = reservations[candidateIndex + 1];

    if (previous) {
      const ready =
        previous.end +
        this.policy.vehicleTurnaroundSeconds(
          vehicle.id,
          previous.destinationStationId
        );

      if (
        ready > candidate.value.start ||
        previous.destinationStationId !== candidate.value.originStationId
      ) {
        return err(
          new DomainError(
            "VEHICLE_NOT_AVAILABLE",
            "Vehicle reservation conflicts with a previous trip or station",
            {
              vehicleId: vehicle.id,
              previousTripId: previous.trip.id,
              tripId: trip.id
            }
          )
        );
      }
    } else {
      if (
        vehicle.currentStationId !== candidate.value.originStationId ||
        Number(vehicle.availableAtGameSecond) > candidate.value.start
      ) {
        return err(
          new DomainError(
            "VEHICLE_NOT_AVAILABLE",
            "Vehicle cannot reach the trip origin by the planned start",
            {
              vehicleId: vehicle.id,
              currentStationId: vehicle.currentStationId,
              requiredStationId: candidate.value.originStationId,
              availableAtGameSecond: vehicle.availableAtGameSecond
            }
          )
        );
      }
    }

    if (next) {
      const ready =
        candidate.value.end +
        this.policy.vehicleTurnaroundSeconds(
          vehicle.id,
          candidate.value.destinationStationId
        );

      if (
        ready > next.start ||
        candidate.value.destinationStationId !== next.originStationId
      ) {
        return err(
          new DomainError(
            "VEHICLE_NOT_AVAILABLE",
            "Vehicle reservation conflicts with a following trip or station",
            {
              vehicleId: vehicle.id,
              tripId: trip.id,
              nextTripId: next.trip.id
            }
          )
        );
      }
    }

    return ok(true);
  }

  validateDriverReservation(
    trip: TripInstance,
    driver: Driver,
    model: VehicleModel
  ): Result<true, DomainError> {
    const candidate = this.buildReservation(trip, model);
    if (!candidate.ok) return candidate;

    const reservations: Reservation[] = [];
    for (const other of this.repositories.trips.findByDriver(driver.id)) {
      if (
        other.id === trip.id ||
        other.status === "cancelled" ||
        other.status === "completed" ||
        other.vehicleId === null
      ) continue;

      const otherVehicle = this.repositories.vehicles.getById(
        other.vehicleId
      );
      const otherModel = otherVehicle
        ? this.repositories.vehicleModels.getById(otherVehicle.modelId)
        : undefined;
      if (!otherModel) continue;

      const built = this.buildReservation(other, otherModel);
      if (built.ok) reservations.push(built.value);
    }
    reservations.push(candidate.value);
    reservations.sort((a, b) => a.start - b.start);

    const candidateIndex = reservations.findIndex(
      (item) => item.trip.id === trip.id
    );
    const previous = reservations[candidateIndex - 1];
    const next = reservations[candidateIndex + 1];

    if (previous) {
      const ready =
        previous.end +
        this.policy.driverTurnaroundSeconds(
          driver.id,
          previous.destinationStationId
        );

      if (
        ready > candidate.value.start ||
        previous.destinationStationId !== candidate.value.originStationId
      ) {
        return err(
          new DomainError(
            "DRIVER_NOT_AVAILABLE",
            "Driver reservation conflicts with a previous trip or station",
            {
              driverId: driver.id,
              previousTripId: previous.trip.id,
              tripId: trip.id
            }
          )
        );
      }
    } else if (
      driver.currentStationId !== candidate.value.originStationId ||
      Number(driver.availableAtGameSecond) > candidate.value.start
    ) {
      return err(
        new DomainError(
          "DRIVER_NOT_AVAILABLE",
          "Driver cannot reach the trip origin by the planned start",
          {
            driverId: driver.id,
            currentStationId: driver.currentStationId,
            requiredStationId: candidate.value.originStationId
          }
        )
      );
    }

    if (next) {
      const ready =
        candidate.value.end +
        this.policy.driverTurnaroundSeconds(
          driver.id,
          candidate.value.destinationStationId
        );

      if (
        ready > next.start ||
        candidate.value.destinationStationId !== next.originStationId
      ) {
        return err(
          new DomainError(
            "DRIVER_NOT_AVAILABLE",
            "Driver reservation conflicts with a following trip or station",
            {
              driverId: driver.id,
              tripId: trip.id,
              nextTripId: next.trip.id
            }
          )
        );
      }
    }

    const duty = this.validateDriverDuty(reservations, candidateIndex, driver);
    if (!duty.ok) return duty;

    return ok(true);
  }

  private validateDriverDuty(
    reservations: readonly Reservation[],
    candidateIndex: number,
    driver: Driver
  ): Result<true, DomainError> {
    const rest = this.policy.minimumDriverRestSeconds(driver.id);

    let start = candidateIndex;
    while (
      start > 0 &&
      reservations[start]!.start - reservations[start - 1]!.end < rest
    ) {
      start -= 1;
    }

    let end = candidateIndex;
    while (
      end < reservations.length - 1 &&
      reservations[end + 1]!.start - reservations[end]!.end < rest
    ) {
      end += 1;
    }

    const chain = reservations.slice(start, end + 1);
    const continuousDriving = chain.reduce(
      (sum, item) => sum + item.drivingSeconds,
      0
    );
    const dutySeconds =
      chain[chain.length - 1]!.end - chain[0]!.start;

    if (
      continuousDriving >
      this.policy.maximumContinuousDrivingSeconds(driver.id)
    ) {
      return err(
        new DomainError(
          "DRIVER_NOT_AVAILABLE",
          "Driver continuous driving limit would be exceeded",
          { driverId: driver.id, continuousDriving }
        )
      );
    }

    if (dutySeconds > this.policy.maximumDutySeconds(driver.id)) {
      return err(
        new DomainError(
          "DRIVER_NOT_AVAILABLE",
          "Driver duty-time limit would be exceeded",
          { driverId: driver.id, dutySeconds }
        )
      );
    }

    return ok(true);
  }

  private buildReservation(
    trip: TripInstance,
    model: VehicleModel
  ): Result<Reservation, DomainError> {
    const route = this.repositories.routes.getById(trip.routeId);
    const origin = route?.stopPoints[0]?.stationId;
    const destination =
      route?.stopPoints[route.stopPoints.length - 1]?.stationId;

    if (!route || !origin || !destination) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Trip route is missing terminal stations",
          { tripId: trip.id }
        )
      );
    }

    const window = estimateTripWindow(
      trip,
      route,
      model,
      this.repositories.world.get()
    );

    return ok({
      trip,
      originStationId: origin,
      destinationStationId: destination,
      start: Number(window.startsAtGameSecond),
      end: Number(window.arrivesAtGameSecond),
      drivingSeconds: window.drivingSeconds
    });
  }
}
