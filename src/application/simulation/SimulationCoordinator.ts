import type { VisibleVehicleDto } from "../../contracts/dto/MapDto.js";
import type { TripId } from "../../contracts/ids/EntityIds.js";
import type { DomainError } from "../../core/errors/DomainError.js";
import { units, type GameSecond } from "../../core/units/Units.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { disruptTrip } from "../../domain/trip/TripRules.js";
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
import type { FleetOperationsCoordinator } from "../operations/FleetOperationsCoordinator.js";
import type { OperationsExecutionCoordinator } from "../operations/OperationsExecutionCoordinator.js";
import type { VehicleMarketCoordinator } from "../vehicle-market/VehicleMarketCoordinator.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
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
  private currentGameSecond: GameSecond = units.gameSecond(0);

  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    passengerPolicy: PassengerDemandPolicy,
    private readonly finance: FinanceCoordinator,
    private readonly fleetOperations: FleetOperationsCoordinator,
    private readonly operationsExecution: OperationsExecutionCoordinator,
    private readonly vehicleMarket: VehicleMarketCoordinator,
    private readonly operationsPolicy: OperationsPolicy,
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
    const target = Number(targetGameSecond);
    const current = Number(this.currentGameSecond);

    if (target < current) {
      return {
        advancedTripIds: [],
        completedTripIds: [],
        blockedTripIds: [],
        issues: []
      };
    }

    const advancedTripIds = new Set<TripId>();
    const completedTripIds = new Set<TripId>();
    const blockedTripIds = new Set<TripId>();
    const issues: SimulationIssue[] = [];

    this.operationsExecution.executeDueAt(this.currentGameSecond);

    while (Number(this.currentGameSecond) < target) {
      const nextBoundary =
        this.operationsExecution.nextBoundaryAfter(
          this.currentGameSecond,
          targetGameSecond
        ) ?? targetGameSecond;

      const report = this.advanceCoreTo(
        nextBoundary,
        tierForTrip
      );

      for (const id of report.advancedTripIds) advancedTripIds.add(id);
      for (const id of report.completedTripIds) completedTripIds.add(id);
      for (const id of report.blockedTripIds) blockedTripIds.add(id);
      issues.push(...report.issues);

      this.currentGameSecond = nextBoundary;
      this.operationsExecution.executeDueAt(this.currentGameSecond);
    }

    if (target === current) {
      this.operationsExecution.executeDueAt(targetGameSecond);
    }

    return {
      advancedTripIds: [...advancedTripIds],
      completedTripIds: [...completedTripIds],
      blockedTripIds: [...blockedTripIds],
      issues
    };
  }

  private advanceCoreTo(
    targetGameSecond: GameSecond,
    tierForTrip: SimulationTierResolver
  ): SimulationAdvanceReport {
    this.fleetOperations.advanceTo(targetGameSecond);
    this.vehicleMarket.advanceTo(targetGameSecond);
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

      if (vehicle.status === "broken") {
        const disrupted = disruptTrip(trip);
        if (disrupted.ok) {
          this.repositories.trips.save(disrupted.value);
          this.vehicleIndex.remove(trip.id);
          blockedTripIds.push(trip.id);
          this.events.publish(
            createSimulationDomainEvent(
              "trip.disrupted",
              "trip",
              trip.id,
              targetGameSecond,
              {
                tripId: trip.id,
                vehicleId: vehicle.id,
                incident: vehicle.activeIncident?.kind ?? null
              }
            )
          );
        }
        continue;
      }

      if (vehicle.status !== "running") continue;

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
          vehicle.seatCapacity,
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

      const vehicleAfterLifecycle =
        trip.vehicleId === null
          ? undefined
          : this.repositories.vehicles.getById(trip.vehicleId);

      if (
        !moved.value.completed &&
        vehicleAfterLifecycle?.status === "broken"
      ) {
        const disrupted = disruptTrip(processedTrip);
        if (disrupted.ok) {
          processedTrip = disrupted.value;
          this.repositories.trips.save(processedTrip);
          advancedTripIds.push(trip.id);
          blockedTripIds.push(trip.id);
          this.vehicleIndex.remove(trip.id);

          this.events.publish(
            createSimulationDomainEvent(
              "trip.disrupted",
              "trip",
              trip.id,
              processedTrip.position.lastUpdatedGameSecond,
              {
                tripId: trip.id,
                vehicleId: vehicleAfterLifecycle.id,
                incident:
                  vehicleAfterLifecycle.activeIncident?.kind ?? null
              }
            )
          );
          continue;
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
    const route = this.repositories.routes.getById(trip.routeId);
    const destination =
      route?.stopPoints[route.stopPoints.length - 1]?.stationId ?? null;
    const arrival =
      trip.actualArrivalGameSecond ??
      trip.position.lastUpdatedGameSecond;

    if (trip.vehicleId !== null) {
      const vehicle = this.repositories.vehicles.getById(trip.vehicleId);
      if (vehicle) {
        const availableAt =
          destination === null
            ? arrival
            : ((
                Number(arrival) +
                this.operationsPolicy.vehicleTurnaroundSeconds(
                  vehicle.id,
                  destination
                )
              ) as GameSecond);

        this.repositories.vehicles.save(
          releaseVehicleFromTrip(
            vehicle,
            trip.id,
            destination,
            availableAt
          )
        );
      }
    }

    if (trip.driverId !== null) {
      const driver = this.repositories.staff.getDriverById(trip.driverId);
      if (driver) {
        const availableAt =
          destination === null
            ? arrival
            : ((
                Number(arrival) +
                this.operationsPolicy.driverTurnaroundSeconds(
                  driver.id,
                  destination
                )
              ) as GameSecond);
        const drivingSeconds =
          trip.actualDepartureGameSecond === null
            ? 0
            : Math.max(
                0,
                Number(arrival) -
                  Number(trip.actualDepartureGameSecond)
              );

        this.repositories.staff.saveDriver(
          releaseDriverFromTrip(
            driver,
            trip.id,
            destination,
            availableAt,
            drivingSeconds,
            arrival
          )
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
