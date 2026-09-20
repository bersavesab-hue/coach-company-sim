import type { VisibleVehicleDto } from "../../contracts/dto/MapDto.js";
import type { TripId } from "../../contracts/ids/EntityIds.js";
import type { DomainError } from "../../core/errors/DomainError.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { releaseDriverFromTrip } from "../../domain/staff/DriverAssignmentRules.js";
import { releaseVehicleFromTrip } from "../../domain/vehicle/VehicleAssignmentRules.js";
import { advanceRunningTrip } from "../../simulation/movement/TripMovement.js";
import { resolveTripWorldPosition } from "../../simulation/movement/TripWorldPosition.js";
import { serveRouteStop } from "../../simulation/passenger/PassengerFlow.js";
import type { PassengerDemandPolicy } from "../../simulation/passenger/PassengerDemandPolicy.js";
import {
  isSimulationTierDue,
  type SimulationTier
} from "../../simulation/tiering/SimulationTier.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { FinanceCoordinator } from "../finance/FinanceCoordinator.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { VehicleSpatialIndex } from "../spatial/VehicleSpatialIndex.js";
import { PassengerDemandCoordinator } from "./PassengerDemandCoordinator.js";

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
  private readonly passengerDemand: PassengerDemandCoordinator;

  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    passengerPolicy: PassengerDemandPolicy,
    private readonly finance: FinanceCoordinator,
    readonly vehicleIndex: VehicleSpatialIndex
  ) {
    this.passengerDemand = new PassengerDemandCoordinator(
      repositories,
      events,
      passengerPolicy
    );
  }

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
    this.passengerDemand.advanceTo(targetGameSecond);

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

      if (!route || !vehicle) continue;

      const model = this.repositories.vehicleModels.getById(vehicle.modelId);
      if (!model) continue;

      const moved = advanceRunningTrip(
        trip,
        route,
        model,
        this.repositories.world.get(),
        this.repositories.worldRuntime.get(),
        targetGameSecond
      );

      if (!moved.ok) {
        issues.push({ tripId: trip.id, error: moved.error });
        continue;
      }

      if (moved.value.distanceTraveledM > 0) {
        this.repositories.vehicles.save({
          ...vehicle,
          mileageM: units.distanceM(
            Number(vehicle.mileageM) +
              moved.value.distanceTraveledM
          )
        });
      }

      if (
        trip.vehicleId !== null &&
        trip.driverId !== null &&
        moved.value.movingSeconds + moved.value.idleSeconds > 0
      ) {
        this.events.publish(
          createSimulationDomainEvent(
            "trip.operatingInterval",
            "trip",
            trip.id,
            moved.value.trip.position.lastUpdatedGameSecond,
            {
              tripId: trip.id,
              routeId: route.id,
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              movingSeconds: moved.value.movingSeconds,
              idleSeconds: moved.value.idleSeconds,
              distanceTraveledM: moved.value.distanceTraveledM,
              roadUsage: moved.value.roadUsage
            }
          )
        );
      }

      let processedTrip = moved.value.trip;

      for (const reached of moved.value.reachedBoundaries) {
        const stopIndex = route.stopPoints.findIndex(
          (stop) =>
            stop.pathLegBoundaryIndex === reached.pathLegBoundaryIndex
        );
        if (stopIndex < 0) continue;

        const stop = route.stopPoints[stopIndex]!;
        const flow = serveRouteStop(
          processedTrip,
          route,
          stopIndex,
          model.seatCapacity,
          this.repositories.passengerRuntime.get()
        );
        processedTrip = flow.trip;

        this.events.publish(
          createSimulationDomainEvent(
            "trip.arrivedAtStop",
            "trip",
            processedTrip.id,
            reached.gameSecond,
            {
              tripId: processedTrip.id,
              stationId: stop.stationId
            }
          )
        );

        if (flow.alightedCount > 0) {
          this.events.publish(
            createSimulationDomainEvent(
              "passengers.alighted",
              "trip",
              processedTrip.id,
              reached.gameSecond,
              {
                tripId: processedTrip.id,
                stationId: stop.stationId,
                count: flow.alightedCount,
                alightedGroups: flow.alightedGroups
              }
            )
          );
        }

        if (flow.boardedCount > 0) {
          this.events.publish(
            createSimulationDomainEvent(
              "passengers.boarded",
              "trip",
              processedTrip.id,
              reached.gameSecond,
              {
                tripId: processedTrip.id,
                stationId: stop.stationId,
                count: flow.boardedCount,
                boardedGroups: flow.boardedGroups,
                leftWaitingCount: flow.leftWaitingCount
              }
            )
          );
        }
      }

      this.repositories.trips.save(processedTrip);
      advancedTripIds.push(trip.id);

      if (moved.value.blockedRoadSegmentId !== null) {
        blockedTripIds.push(trip.id);
      }

      if (moved.value.completed) {
        this.releaseResources(processedTrip);
        this.vehicleIndex.remove(trip.id);
        completedTripIds.push(trip.id);

        this.events.publish(
          createSimulationDomainEvent(
            "trip.completed",
            "trip",
            trip.id,
            moved.value.completionGameSecond ??
              processedTrip.position.lastUpdatedGameSecond,
            {
              tripId: trip.id,
              routeId: trip.routeId,
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              actualArrivalGameSecond:
                processedTrip.actualArrivalGameSecond
            }
          )
        );
      } else {
        this.indexTrip(processedTrip);
      }
    }

    this.finance.advanceTo(targetGameSecond);

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
