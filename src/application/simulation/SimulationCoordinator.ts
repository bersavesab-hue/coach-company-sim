import type { TripId } from "../../contracts/ids/EntityIds.js";
import type { VisibleVehicleDto } from "../../contracts/dto/MapDto.js";
import type { DomainError } from "../../core/errors/DomainError.js";
import type { GameSecond } from "../../core/units/Units.js";
import { releaseDriverFromTrip } from "../../domain/staff/DriverAssignmentRules.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { releaseVehicleFromTrip } from "../../domain/vehicle/VehicleAssignmentRules.js";
import { advanceRunningTrip } from "../../simulation/movement/TripMovement.js";
import { resolveTripWorldPosition } from "../../simulation/movement/TripWorldPosition.js";
import {
  isSimulationTierDue,
  type SimulationTier
} from "../../simulation/tiering/SimulationTier.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { VehicleSpatialIndex } from "../spatial/VehicleSpatialIndex.js";

export type SimulationTierResolver = (
  trip: TripInstance
) => SimulationTier;

export interface SimulationIssue {
  readonly tripId: TripId;
  readonly error: DomainError;
}

export interface SimulationAdvanceReport {
  readonly advancedTripIds: readonly TripId[];
  readonly completedTripIds: readonly TripId[];
  readonly blockedTripIds: readonly TripId[];
  readonly issues: readonly SimulationIssue[];
}

export class SimulationCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    readonly vehicleIndex: VehicleSpatialIndex
  ) {}

  rebuildVehicleIndex(): void {
    this.vehicleIndex.clear();

    for (const trip of this.repositories.trips.findRunning()) {
      this.indexTrip(trip);
    }
  }

  advanceTo(
    targetGameSecond: GameSecond,
    tierForTrip: SimulationTierResolver = () => "foreground"
  ): SimulationAdvanceReport {
    const advancedTripIds: TripId[] = [];
    const completedTripIds: TripId[] = [];
    const blockedTripIds: TripId[] = [];
    const issues: SimulationIssue[] = [];

    for (const trip of this.repositories.trips.findRunning()) {
      const tier = tierForTrip(trip);

      if (
        !isSimulationTierDue(
          trip.position.lastUpdatedGameSecond,
          targetGameSecond,
          tier
        )
      ) {
        continue;
      }

      const route = this.repositories.routes.getById(trip.routeId);
      const vehicle =
        trip.vehicleId === null
          ? undefined
          : this.repositories.vehicles.getById(trip.vehicleId);

      if (!route || !vehicle) {
        continue;
      }

      const model = this.repositories.vehicleModels.getById(vehicle.modelId);
      if (!model) {
        continue;
      }

      const moved = advanceRunningTrip(
        trip,
        route,
        model,
        this.repositories.world.get(),
        this.repositories.worldRuntime.get(),
        targetGameSecond
      );

      if (!moved.ok) {
        issues.push({
          tripId: trip.id,
          error: moved.error
        });
        continue;
      }

      this.repositories.trips.save(moved.value.trip);
      advancedTripIds.push(trip.id);

      if (moved.value.blockedRoadSegmentId !== null) {
        blockedTripIds.push(trip.id);
      }

      if (moved.value.completed) {
        this.releaseResources(moved.value.trip);
        this.vehicleIndex.remove(trip.id);
        completedTripIds.push(trip.id);

        this.events.publish(
          createSimulationDomainEvent(
            "trip.completed",
            "trip",
            trip.id,
            moved.value.completionGameSecond ??
              moved.value.trip.position.lastUpdatedGameSecond,
            {
              tripId: trip.id,
              routeId: trip.routeId,
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              actualArrivalGameSecond:
                moved.value.trip.actualArrivalGameSecond
            }
          )
        );
      } else {
        this.indexTrip(moved.value.trip);
      }
    }

    return {
      advancedTripIds,
      completedTripIds,
      blockedTripIds,
      issues
    };
  }

  private releaseResources(trip: TripInstance): void {
    if (trip.vehicleId !== null) {
      const vehicle = this.repositories.vehicles.getById(trip.vehicleId);
      if (vehicle) {
        this.repositories.vehicles.save(
          releaseVehicleFromTrip(vehicle, trip.id)
        );
      }
    }

    if (trip.driverId !== null) {
      const driver = this.repositories.staff.getDriverById(trip.driverId);
      if (driver) {
        this.repositories.staff.saveDriver(
          releaseDriverFromTrip(driver, trip.id)
        );
      }
    }
  }

  private indexTrip(trip: TripInstance): void {
    if (trip.vehicleId === null) return;

    const route = this.repositories.routes.getById(trip.routeId);
    if (!route) return;

    const point = resolveTripWorldPosition(
      trip,
      route,
      this.repositories.world.get()
    );
    if (!point) return;

    const dto: VisibleVehicleDto = {
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      routeId: trip.routeId,
      xM: point.xM,
      yM: point.yM
    };

    this.vehicleIndex.upsert(dto, point);
  }
}
