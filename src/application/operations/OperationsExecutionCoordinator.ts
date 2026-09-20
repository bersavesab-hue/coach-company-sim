import type {
  CompanyId,
  StaffId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import { ids } from "../../contracts/ids/EntityIds.js";
import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";
import type { ErrorCode } from "../../core/errors/ErrorCode.js";
import { units, type GameSecond } from "../../core/units/Units.js";
import type {
  CommittedOperationsSchedule,
  ScheduledOperation
} from "../../domain/operations/CommittedOperationsSchedule.js";
import type { FleetTask } from "../../domain/operations/FleetTask.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { estimateRouteDrivingSeconds } from "../services/TripTiming.js";
import type { CommandBus } from "../CommandBus.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export class OperationsExecutionCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly commands: CommandBus,
    private readonly events: DomainEventBus,
    private readonly policy: OperationsPolicy
  ) {
    events.subscribe((event) => this.handleEvent(event));
  }

  nextBoundaryAfter(
    currentGameSecond: GameSecond,
    targetGameSecond: GameSecond
  ): GameSecond | null {
    let next: number | null = null;
    const current = Number(currentGameSecond);
    const target = Number(targetGameSecond);

    const consider = (value: number) => {
      if (value <= current || value > target) return;
      if (next === null || value < next) next = value;
    };

    for (const schedule of this.repositories.operationsSchedules.findActive()) {
      if (
        schedule.status === "replan_required" &&
        schedule.replanAtGameSecond !== null
      ) {
        consider(Number(schedule.replanAtGameSecond));
      }

      for (const action of schedule.actions) {
        if (
          action.status === "completed" ||
          action.status === "failed" ||
          action.status === "cancelled"
        ) {
          continue;
        }

        if (action.kind === "passenger_trip") {
          if (action.status === "planned") {
            consider(this.boardingStart(action));
          } else if (action.status === "boarding") {
            consider(Number(action.startsAtGameSecond));
          } else if (action.status === "started") {
            consider(Number(action.endsAtGameSecond));
          }
          continue;
        }

        if (action.status === "planned") {
          consider(Number(action.startsAtGameSecond));
        } else if (action.status === "started") {
          consider(Number(action.endsAtGameSecond));
        }
      }
    }

    return next === null ? null : units.gameSecond(next);
  }

  executeDueAt(gameSecond: GameSecond): void {
    for (const initial of this.repositories.operationsSchedules.findActive()) {
      this.refreshActionCompletions(initial, gameSecond);
    }

    for (const initial of this.repositories.operationsSchedules.findActive()) {
      this.tryResumeRecoveredTrips(initial, gameSecond);
    }

    for (const initial of this.repositories.operationsSchedules.findActive()) {
      if (
        initial.status === "replan_required" &&
        initial.replanAtGameSecond !== null &&
        Number(initial.replanAtGameSecond) <= Number(gameSecond)
      ) {
        this.commands.dispatch({
          commandId: internalCommandId(
            initial.companyId,
            initial.gameDay,
            initial.revision,
            0,
            "replan",
            gameSecond
          ),
          type: "operations.replanDay",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: initial.companyId,
          payload: {
            companyId: initial.companyId,
            gameDay: initial.gameDay
          }
        });
      }
    }

    for (const schedule of this.repositories.operationsSchedules.findActive()) {
      this.executeScheduleDue(schedule, gameSecond);
    }
  }

  private executeScheduleDue(
    schedule: CommittedOperationsSchedule,
    gameSecond: GameSecond
  ): void {
    let current =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        schedule.companyId,
        schedule.gameDay
      ) ?? schedule;

    for (const action of current.actions) {
      const latest =
        this.repositories.operationsSchedules.getByCompanyAndDay(
          current.companyId,
          current.gameDay
        ) ?? current;
      const live =
        latest.actions.find((item) => item.sequence === action.sequence) ??
        action;

      if (live.status === "planned") {
        if (live.kind === "passenger_trip") {
          if (this.boardingStart(live) <= Number(gameSecond)) {
            this.startBoarding(latest, live, gameSecond);
          }
        } else if (
          Number(live.startsAtGameSecond) <= Number(gameSecond)
        ) {
          this.startSupportAction(latest, live, gameSecond);
        }
      }

      const refreshed =
        this.repositories.operationsSchedules.getByCompanyAndDay(
          current.companyId,
          current.gameDay
        ) ?? current;
      const after =
        refreshed.actions.find((item) => item.sequence === action.sequence);
      if (!after) continue;

      if (
        after.kind === "passenger_trip" &&
        after.status === "boarding" &&
        Number(after.startsAtGameSecond) <= Number(gameSecond)
      ) {
        this.departTrip(refreshed, after, gameSecond);
      }

      if (
        after.kind === "rest" &&
        after.status === "started" &&
        Number(after.endsAtGameSecond) <= Number(gameSecond)
      ) {
        this.completeRest(refreshed, after, gameSecond);
      }

      current =
        this.repositories.operationsSchedules.getByCompanyAndDay(
          current.companyId,
          current.gameDay
        ) ?? current;
    }

    this.refreshActionCompletions(current, gameSecond);
  }

  private startBoarding(
    schedule: CommittedOperationsSchedule,
    action: ScheduledOperation,
    gameSecond: GameSecond
  ): void {
    if (action.tripId === null) {
      this.failAction(schedule, action, "OPERATIONS_ACTION_FAILED", gameSecond);
      return;
    }

    const result = this.commands.dispatch({
      commandId: internalCommandId(
        schedule.companyId,
        schedule.gameDay,
        schedule.revision,
        action.sequence,
        "boarding",
        gameSecond
      ),
      type: "trip.startBoarding",
      issuedAtGameSecond: gameSecond,
      actorCompanyId: schedule.companyId,
      payload: { tripId: action.tripId }
    });

    if (!result.ok) {
      this.failAction(
        schedule,
        action,
        result.error.code,
        gameSecond
      );
      return;
    }

    this.replaceAction(schedule, {
      ...action,
      status: "boarding"
    });
  }

  private departTrip(
    schedule: CommittedOperationsSchedule,
    action: ScheduledOperation,
    gameSecond: GameSecond
  ): void {
    if (action.tripId === null) {
      this.failAction(schedule, action, "OPERATIONS_ACTION_FAILED", gameSecond);
      return;
    }

    const result = this.commands.dispatch({
      commandId: internalCommandId(
        schedule.companyId,
        schedule.gameDay,
        schedule.revision,
        action.sequence,
        "depart",
        gameSecond
      ),
      type: "trip.depart",
      issuedAtGameSecond: gameSecond,
      actorCompanyId: schedule.companyId,
      payload: { tripId: action.tripId }
    });

    if (!result.ok) {
      this.failAction(
        schedule,
        action,
        result.error.code,
        gameSecond
      );
      return;
    }

    this.replaceAction(schedule, {
      ...action,
      status: "started"
    });
  }

  private startSupportAction(
    schedule: CommittedOperationsSchedule,
    action: ScheduledOperation,
    gameSecond: GameSecond
  ): void {
    let result:
      | ReturnType<CommandBus["dispatch"]>
      | null = null;

    switch (action.kind) {
      case "deadhead":
        if (
          action.vehicleId === null ||
          action.driverId === null ||
          action.toStationId === null
        ) {
          this.failAction(
            schedule,
            action,
            "OPERATIONS_ACTION_FAILED",
            gameSecond
          );
          return;
        }
        result = this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "deadhead",
            gameSecond
          ),
          type: "fleet.reposition",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: {
            vehicleId: action.vehicleId,
            driverId: action.driverId,
            toStationId: action.toStationId
          }
        });
        break;

      case "refuel":
        if (action.vehicleId === null) {
          this.failAction(
            schedule,
            action,
            "OPERATIONS_ACTION_FAILED",
            gameSecond
          );
          return;
        }
        result = this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "refuel",
            gameSecond
          ),
          type: "vehicle.refuel",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: {
            vehicleId: action.vehicleId,
            energyUnits: action.energyUnits
          }
        });
        break;

      case "maintenance":
        if (action.vehicleId === null) {
          this.failAction(
            schedule,
            action,
            "OPERATIONS_ACTION_FAILED",
            gameSecond
          );
          return;
        }
        result = this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "maintenance",
            gameSecond
          ),
          type: "vehicle.sendToMaintenance",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: { vehicleId: action.vehicleId }
        });
        break;

      case "rest":
        if (action.driverId === null) {
          this.failAction(
            schedule,
            action,
            "OPERATIONS_ACTION_FAILED",
            gameSecond
          );
          return;
        }
        result = this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "rest",
            gameSecond
          ),
          type: "driver.startRest",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: {
            driverId: action.driverId,
            restUntilGameSecond: action.endsAtGameSecond
          }
        });
        break;

      case "passenger_trip":
        return;
    }

    if (!result?.ok) {
      this.failAction(
        schedule,
        action,
        result?.error.code ?? "OPERATIONS_ACTION_FAILED",
        gameSecond
      );
      return;
    }

    const value = result.value as Partial<FleetTask>;
    this.replaceAction(schedule, {
      ...action,
      fleetTaskId:
        typeof value.id === "string" && action.kind !== "rest"
          ? value.id
          : null,
      status: "started"
    });
  }

  private completeRest(
    schedule: CommittedOperationsSchedule,
    action: ScheduledOperation,
    gameSecond: GameSecond
  ): void {
    if (action.driverId === null) {
      this.failAction(schedule, action, "OPERATIONS_ACTION_FAILED", gameSecond);
      return;
    }

    const result = this.commands.dispatch({
      commandId: internalCommandId(
        schedule.companyId,
        schedule.gameDay,
        schedule.revision,
        action.sequence,
        "rest_complete",
        gameSecond
      ),
      type: "driver.completeRest",
      issuedAtGameSecond: gameSecond,
      actorCompanyId: schedule.companyId,
      payload: { driverId: action.driverId }
    });

    if (!result.ok) {
      this.failAction(schedule, action, result.error.code, gameSecond);
      return;
    }

    this.replaceAction(schedule, {
      ...action,
      status: "completed"
    });
  }

  private refreshActionCompletions(
    schedule: CommittedOperationsSchedule,
    gameSecond: GameSecond
  ): void {
    let changed = false;
    const actions = schedule.actions.map((action) => {
      if (action.status !== "started") return action;

      if (action.kind === "passenger_trip" && action.tripId !== null) {
        const trip = this.repositories.trips.getById(action.tripId);
        if (trip?.status === "completed") {
          changed = true;
          return { ...action, status: "completed" as const };
        }
        return action;
      }

      if (action.kind === "rest") return action;

      if (action.fleetTaskId !== null) {
        const task = this.repositories.fleetTasks.getById(
          action.fleetTaskId
        );
        if (task?.status === "completed") {
          changed = true;
          return { ...action, status: "completed" as const };
        }
      }

      return action;
    });

    if (!changed) return;

    const terminal = actions.every(
      (action) =>
        action.status === "completed" ||
        action.status === "failed" ||
        action.status === "cancelled"
    );

    this.repositories.operationsSchedules.save({
      ...schedule,
      actions,
      status: terminal ? "completed" : schedule.status,
      replanAtGameSecond:
        terminal ? null : schedule.replanAtGameSecond
    });
  }

  private tryResumeRecoveredTrips(
    schedule: CommittedOperationsSchedule,
    gameSecond: GameSecond
  ): void {
    for (const action of schedule.actions) {
      if (
        action.kind !== "passenger_trip" ||
        action.tripId === null ||
        action.status !== "started"
      ) {
        continue;
      }

      const trip = this.repositories.trips.getById(action.tripId);
      if (
        !trip ||
        trip.status !== "disrupted" ||
        trip.recoveryStationId === null ||
        trip.vehicleId !== null ||
        trip.driverId !== null
      ) {
        continue;
      }

      const pair = this.findRecoveryPair(trip, gameSecond);
      if (!pair) continue;

      const assignedVehicle = this.commands.dispatch({
        commandId: internalCommandId(
          schedule.companyId,
          schedule.gameDay,
          schedule.revision,
          action.sequence,
          "recovery_vehicle",
          gameSecond
        ),
        type: "trip.assignVehicle",
        issuedAtGameSecond: gameSecond,
        actorCompanyId: schedule.companyId,
        payload: {
          tripId: trip.id,
          vehicleId: pair.vehicleId
        }
      });
      if (!assignedVehicle.ok) continue;

      const assignedDriver = this.commands.dispatch({
        commandId: internalCommandId(
          schedule.companyId,
          schedule.gameDay,
          schedule.revision,
          action.sequence,
          "recovery_driver",
          gameSecond
        ),
        type: "trip.assignDriver",
        issuedAtGameSecond: gameSecond,
        actorCompanyId: schedule.companyId,
        payload: {
          tripId: trip.id,
          driverId: pair.driverId
        }
      });
      if (!assignedDriver.ok) {
        this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "recovery_clear",
            gameSecond
          ),
          type: "trip.clearResources",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: { tripId: trip.id }
        });
        continue;
      }

      const resumed = this.commands.dispatch({
        commandId: internalCommandId(
          schedule.companyId,
          schedule.gameDay,
          schedule.revision,
          action.sequence,
          "resume",
          gameSecond
        ),
        type: "trip.resume",
        issuedAtGameSecond: gameSecond,
        actorCompanyId: schedule.companyId,
        payload: { tripId: trip.id }
      });

      if (!resumed.ok) {
        this.commands.dispatch({
          commandId: internalCommandId(
            schedule.companyId,
            schedule.gameDay,
            schedule.revision,
            action.sequence,
            "resume_clear",
            gameSecond
          ),
          type: "trip.clearResources",
          issuedAtGameSecond: gameSecond,
          actorCompanyId: schedule.companyId,
          payload: { tripId: trip.id }
        });
        continue;
      }

      const resumedTrip = resumed.value as TripInstance;
      const route = this.repositories.routes.getById(resumedTrip.routeId);
      const vehicle = this.repositories.vehicles.getById(pair.vehicleId);
      const model = vehicle
        ? this.repositories.vehicleModels.getById(vehicle.modelId)
        : undefined;

      let end = Number(action.endsAtGameSecond);
      if (route && model) {
        end =
          Number(gameSecond) +
          estimateRouteDrivingSeconds(
            route,
            model,
            this.repositories.world.get(),
            resumedTrip.position.activeRoadSegmentIndex,
            Number(resumedTrip.position.offsetOnSegmentM)
          );
      }

      this.replaceAction(schedule, {
        ...action,
        vehicleId: pair.vehicleId,
        driverId: pair.driverId,
        endsAtGameSecond: units.gameSecond(end),
        status: "started",
        failureCode: null
      });

      this.markScheduleForReplan(
        schedule,
        gameSecond
      );
    }
  }

  private findRecoveryPair(
    trip: TripInstance,
    gameSecond: GameSecond
  ): { vehicleId: VehicleId; driverId: StaffId } | null {
    const route = this.repositories.routes.getById(trip.routeId);
    const plan =
      trip.servicePlanId === null
        ? undefined
        : this.repositories.servicePlans.getById(trip.servicePlanId);
    const stationId = trip.recoveryStationId;
    if (!route || !plan || stationId === null) return null;

    const vehicles = this.repositories.vehicles
      .findByCompany(route.companyId)
      .filter((vehicle) => {
        if (
          vehicle.status !== "available" ||
          vehicle.activeTripId !== null ||
          vehicle.activeFleetTaskId !== null ||
          vehicle.currentStationId !== stationId ||
          Number(vehicle.availableAtGameSecond) > Number(gameSecond)
        ) {
          return false;
        }
        const model = this.repositories.vehicleModels.getById(
          vehicle.modelId
        );
        return model?.active &&
          model.serviceClass === plan.requiredVehicleClass;
      })
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const drivers = this.repositories.staff
      .findDriversByCompany(route.companyId)
      .filter(
        (driver) =>
          driver.status === "available" &&
          driver.activeTripId === null &&
          driver.activeFleetTaskId === null &&
          driver.currentStationId === stationId &&
          Number(driver.availableAtGameSecond) <= Number(gameSecond) &&
          driver.qualifiedVehicleClasses.includes(
            plan.requiredVehicleClass
          )
      )
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    if (vehicles.length === 0 || drivers.length === 0) return null;
    return {
      vehicleId: vehicles[0]!.id,
      driverId: drivers[0]!.id
    };
  }

  private handleEvent(event: DomainEventEnvelope): void {
    if (event.type === "trip.disrupted") {
      const trip = this.repositories.trips.getById(
        event.aggregateId as TripId
      );
      if (!trip) return;
      const schedule =
        this.repositories.operationsSchedules.findByTrip(trip.id);
      if (!schedule) return;

      const recoveryStop = this.nextRecoveryStop(trip);
      if (recoveryStop === null) {
        this.markScheduleForReplan(schedule, event.gameSecond);
        return;
      }

      const recovery = this.commands.dispatch({
        commandId: internalCommandId(
          schedule.companyId,
          schedule.gameDay,
          schedule.revision,
          0,
          "recover",
          event.gameSecond
        ),
        type: "fleet.recover",
        issuedAtGameSecond: event.gameSecond,
        actorCompanyId: schedule.companyId,
        payload: {
          tripId: trip.id,
          recoveryStationId: recoveryStop
        }
      });

      if (recovery.ok) {
        const task = recovery.value as FleetTask;
        this.markScheduleForReplan(
          schedule,
          task.completesAtGameSecond
        );
      } else {
        this.markScheduleForReplan(schedule, event.gameSecond);
      }
      return;
    }

    if (event.type === "trip.completed") {
      const trip = this.repositories.trips.getById(
        event.aggregateId as TripId
      );
      if (!trip?.actualArrivalGameSecond) return;
      const schedule =
        this.repositories.operationsSchedules.findByTrip(trip.id);
      if (!schedule) return;
      const action = schedule.actions.find(
        (item) => item.tripId === trip.id
      );
      if (
        action &&
        Number(trip.actualArrivalGameSecond) >
          Number(action.endsAtGameSecond)
      ) {
        this.markScheduleForReplan(
          schedule,
          trip.actualArrivalGameSecond
        );
      }
    }
  }

  private nextRecoveryStop(trip: TripInstance) {
    const route = this.repositories.routes.getById(trip.routeId);
    if (!route) return null;

    const currentLeg = trip.position.activeRoadSegmentIndex;
    return (
      route.stopPoints.find(
        (stop) => stop.pathLegBoundaryIndex > currentLeg
      )?.stationId ??
      route.stopPoints[route.stopPoints.length - 1]?.stationId ??
      null
    );
  }

  private markScheduleForReplan(
    schedule: CommittedOperationsSchedule,
    gameSecond: GameSecond
  ): void {
    const latest =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        schedule.companyId,
        schedule.gameDay
      ) ?? schedule;

    this.repositories.operationsSchedules.save({
      ...latest,
      status: "replan_required",
      replanAtGameSecond: gameSecond
    });
  }

  private replaceAction(
    schedule: CommittedOperationsSchedule,
    replacement: ScheduledOperation
  ): void {
    const latest =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        schedule.companyId,
        schedule.gameDay
      ) ?? schedule;

    this.repositories.operationsSchedules.save({
      ...latest,
      actions: latest.actions.map((action) =>
        action.sequence === replacement.sequence
          ? replacement
          : action
      )
    });
  }

  private failAction(
    schedule: CommittedOperationsSchedule,
    action: ScheduledOperation,
    code: ErrorCode,
    gameSecond: GameSecond
  ): void {
    const latest =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        schedule.companyId,
        schedule.gameDay
      ) ?? schedule;

    this.repositories.operationsSchedules.save({
      ...latest,
      status: "replan_required",
      replanAtGameSecond: gameSecond,
      actions: latest.actions.map((item) =>
        item.sequence === action.sequence
          ? {
              ...item,
              status: "failed" as const,
              failureCode: code
            }
          : item
      )
    });

    this.events.publish(
      createSimulationDomainEvent(
        "operations.actionFailed",
        "company",
        schedule.companyId,
        gameSecond,
        {
          companyId: schedule.companyId,
          gameDay: schedule.gameDay,
          revision: schedule.revision,
          sequence: action.sequence,
          kind: action.kind,
          errorCode: code
        }
      )
    );
  }

  private boardingStart(action: ScheduledOperation): number {
    if (action.kind !== "passenger_trip") {
      return Number(action.startsAtGameSecond);
    }
    const trip =
      action.tripId === null
        ? undefined
        : this.repositories.trips.getById(action.tripId);
    const routeId = trip?.routeId;
    const lead =
      routeId === undefined
        ? 0
        : this.policy.passengerBoardingLeadSeconds(routeId);
    return Number(action.startsAtGameSecond) - lead;
  }
}

function internalCommandId(
  companyId: CompanyId,
  gameDay: number,
  revision: number,
  sequence: number,
  phase: string,
  gameSecond: GameSecond
) {
  return ids.command(
    `command.autoexec.${String(companyId).replaceAll(".", "_")}.${gameDay}.${revision}.${sequence}.${phase}.${Number(gameSecond)}`
  );
}
