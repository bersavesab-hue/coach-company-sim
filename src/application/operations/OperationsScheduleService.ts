import type { CommandEnvelope } from "../../contracts/commands/CommandEnvelope.js";
import { ids, type TripId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type {
  CommittedOperationsSchedule,
  ScheduledOperation
} from "../../domain/operations/CommittedOperationsSchedule.js";
import type { DayOperationsPlan } from "../../domain/operations/DayOperationsPlan.js";
import type { CommandBus } from "../CommandBus.js";
import type {
  CommitDayOperationsPayload,
  ReplanDayOperationsPayload
} from "../commands/operations/OperationsCommands.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createDomainEvent } from "../events/createDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import type { DayOperationsPlanner } from "../services/DayOperationsPlanner.js";

export class OperationsScheduleService {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly commands: CommandBus,
    private readonly planner: DayOperationsPlanner,
    private readonly events: DomainEventBus
  ) {}

  commitDay(
    command: CommandEnvelope,
    payload: CommitDayOperationsPayload
  ): Result<CommittedOperationsSchedule, DomainError> {
    const existing =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        payload.companyId,
        payload.gameDay
      );

    if (
      existing &&
      existing.status !== "completed" &&
      existing.status !== "cancelled"
    ) {
      return err(
        new DomainError(
          "OPERATIONS_SCHEDULE_CONFLICT",
          "An active operations schedule already exists for this company/day",
          {
            companyId: payload.companyId,
            gameDay: payload.gameDay,
            revision: existing.revision
          }
        )
      );
    }

    const plan = this.planner.planCompanyDay({
      companyId: payload.companyId,
      gameDay: payload.gameDay,
      generatedAtGameSecond: command.issuedAtGameSecond
    });
    if (!plan.ok) return plan;

    if (!payload.allowPartial && plan.value.stats.uncoveredTrips > 0) {
      return err(
        new DomainError(
          "OPERATIONS_PLAN_UNCOVERED",
          "Day plan contains uncovered passenger trips",
          {
            companyId: payload.companyId,
            gameDay: payload.gameDay,
            uncoveredTrips: plan.value.stats.uncoveredTrips
          }
        )
      );
    }

    const materialized = this.materialize(
      command,
      plan.value,
      existing?.revision ?? 0,
      []
    );
    if (!materialized.ok) return materialized;

    this.repositories.operationsSchedules.save(materialized.value);
    this.events.publish(
      createDomainEvent(
        command,
        "operations.scheduleCommitted",
        "company",
        payload.companyId,
        {
          companyId: payload.companyId,
          gameDay: payload.gameDay,
          revision: materialized.value.revision
        }
      )
    );

    return materialized;
  }

  replanDay(
    command: CommandEnvelope,
    payload: ReplanDayOperationsPayload
  ): Result<CommittedOperationsSchedule, DomainError> {
    const existing =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        payload.companyId,
        payload.gameDay
      );
    if (!existing) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "No committed operations schedule exists for replanning",
          {
            companyId: payload.companyId,
            gameDay: payload.gameDay
          }
        )
      );
    }

    const preserved = existing.actions.filter(
      (action) =>
        action.status !== "planned" ||
        Number(action.startsAtGameSecond) <
          Number(command.issuedAtGameSecond)
    );

    for (const action of existing.actions) {
      if (
        action.kind !== "passenger_trip" ||
        action.status !== "planned" ||
        action.tripId === null ||
        Number(action.startsAtGameSecond) <
          Number(command.issuedAtGameSecond)
      ) {
        continue;
      }

      const trip = this.repositories.trips.getById(action.tripId);
      if (!trip || trip.status !== "planned") continue;

      const cleared = this.commands.dispatch({
        commandId: autoCommandId(
          payload.companyId,
          payload.gameDay,
          existing.revision + 1,
          action.sequence,
          "clear"
        ),
        type: "trip.clearResources",
        issuedAtGameSecond: command.issuedAtGameSecond,
        actorCompanyId: payload.companyId,
        payload: { tripId: trip.id }
      });
      if (!cleared.ok) return cleared;
    }

    const plan = this.planner.planCompanyDay({
      companyId: payload.companyId,
      gameDay: payload.gameDay,
      generatedAtGameSecond: command.issuedAtGameSecond
    });
    if (!plan.ok) return plan;

    const materialized = this.materialize(
      command,
      plan.value,
      existing.revision,
      preserved
    );
    if (!materialized.ok) return materialized;

    this.repositories.operationsSchedules.save(materialized.value);
    this.events.publish(
      createDomainEvent(
        command,
        "operations.scheduleReplanned",
        "company",
        payload.companyId,
        {
          companyId: payload.companyId,
          gameDay: payload.gameDay,
          revision: materialized.value.revision,
          uncoveredTrips: plan.value.stats.uncoveredTrips
        }
      )
    );

    return materialized;
  }

  private materialize(
    command: CommandEnvelope,
    plan: DayOperationsPlan,
    previousRevision: number,
    preserved: readonly ScheduledOperation[]
  ): Result<CommittedOperationsSchedule, DomainError> {
    const revision = previousRevision + 1;
    const tripBySlot = new Map<string, TripId>();

    for (const assignment of plan.tripAssignments) {
      if (assignment.coverage !== "covered") continue;
      if (
        assignment.vehicleId === null ||
        assignment.driverId === null
      ) {
        continue;
      }

      let trip =
        assignment.existingTripId === null
          ? undefined
          : this.repositories.trips.getById(
              assignment.existingTripId
            );

      if (!trip) {
        const prepared = this.commands.dispatch({
          commandId: autoCommandId(
            plan.companyId,
            plan.gameDay,
            revision,
            plan.tripAssignments.indexOf(assignment) + 1,
            "prepare"
          ),
          type: "trip.prepare",
          issuedAtGameSecond: command.issuedAtGameSecond,
          actorCompanyId: plan.companyId,
          payload: {
            servicePlanId: assignment.servicePlanId,
            plannedDepartureGameSecond:
              assignment.plannedDepartureGameSecond
          }
        });
        if (!prepared.ok) return prepared;
        trip = prepared.value as NonNullable<typeof trip>;
      }

      if (trip.vehicleId === null) {
        const assignedVehicle = this.commands.dispatch({
          commandId: autoCommandId(
            plan.companyId,
            plan.gameDay,
            revision,
            plan.tripAssignments.indexOf(assignment) + 1,
            "vehicle"
          ),
          type: "trip.assignVehicle",
          issuedAtGameSecond: command.issuedAtGameSecond,
          actorCompanyId: plan.companyId,
          payload: {
            tripId: trip.id,
            vehicleId: assignment.vehicleId
          }
        });
        if (!assignedVehicle.ok) return assignedVehicle;
        trip = assignedVehicle.value as typeof trip;
      } else if (trip.vehicleId !== assignment.vehicleId) {
        return err(
          new DomainError(
            "OPERATIONS_SCHEDULE_CONFLICT",
            "Existing trip vehicle differs from committed plan",
            {
              tripId: trip.id,
              existingVehicleId: trip.vehicleId,
              plannedVehicleId: assignment.vehicleId
            }
          )
        );
      }

      if (trip.driverId === null) {
        const assignedDriver = this.commands.dispatch({
          commandId: autoCommandId(
            plan.companyId,
            plan.gameDay,
            revision,
            plan.tripAssignments.indexOf(assignment) + 1,
            "driver"
          ),
          type: "trip.assignDriver",
          issuedAtGameSecond: command.issuedAtGameSecond,
          actorCompanyId: plan.companyId,
          payload: {
            tripId: trip.id,
            driverId: assignment.driverId
          }
        });
        if (!assignedDriver.ok) return assignedDriver;
        trip = assignedDriver.value as typeof trip;
      } else if (trip.driverId !== assignment.driverId) {
        return err(
          new DomainError(
            "OPERATIONS_SCHEDULE_CONFLICT",
            "Existing trip driver differs from committed plan",
            {
              tripId: trip.id,
              existingDriverId: trip.driverId,
              plannedDriverId: assignment.driverId
            }
          )
        );
      }

      tripBySlot.set(
        slotKey(
          assignment.servicePlanId,
          assignment.plannedDepartureGameSecond
        ),
        trip.id
      );
    }

    const preservedKeys = new Set(
      preserved.map((action) =>
        action.tripId === null
          ? `support:${action.kind}:${Number(
              action.startsAtGameSecond
            )}:${action.vehicleId ?? ""}:${action.driverId ?? ""}`
          : `trip:${action.tripId}`
      )
    );

    const future: ScheduledOperation[] = [];

    for (const action of plan.actions) {
      const tripId =
        action.kind === "passenger_trip" &&
        action.servicePlanId !== null
          ? tripBySlot.get(
              slotKey(
                action.servicePlanId,
                action.startsAtGameSecond
              )
            ) ?? action.existingTripId
          : null;

      const key =
        tripId === null
          ? `support:${action.kind}:${Number(
              action.startsAtGameSecond
            )}:${action.vehicleId ?? ""}:${action.driverId ?? ""}`
          : `trip:${tripId}`;

      if (preservedKeys.has(key)) continue;
      if (
        Number(action.endsAtGameSecond) <
        Number(command.issuedAtGameSecond)
      ) {
        continue;
      }

      future.push({
        sequence: 0,
        kind: action.kind,
        startsAtGameSecond: action.startsAtGameSecond,
        endsAtGameSecond: action.endsAtGameSecond,
        vehicleId: action.vehicleId,
        driverId: action.driverId,
        tripId: tripId ?? null,
        fleetTaskId: null,
        fromStationId: action.fromStationId,
        toStationId: action.toStationId,
        distanceM: action.distanceM,
        energyUnits: action.energyUnits,
        status: "planned",
        failureCode: null
      });
    }

    const actions = [...preserved, ...future]
      .sort(
        (a, b) =>
          Number(a.startsAtGameSecond) -
            Number(b.startsAtGameSecond) ||
          a.kind.localeCompare(b.kind)
      )
      .map((action, index) => ({
        ...action,
        sequence: index + 1
      }));

    return ok({
      companyId: plan.companyId,
      gameDay: plan.gameDay,
      revision,
      committedAtGameSecond: command.issuedAtGameSecond,
      generatedAtGameSecond: plan.generatedAtGameSecond,
      status: "active",
      replanAtGameSecond: null,
      actions
    });
  }
}

function slotKey(
  servicePlanId: string,
  departure: number
): string {
  return `${servicePlanId}:${Number(departure)}`;
}

function autoCommandId(
  companyId: string,
  gameDay: number,
  revision: number,
  sequence: number,
  phase: string
) {
  return ids.command(
    `command.auto.${companyId.replaceAll(".", "_")}.${gameDay}.${revision}.${sequence}.${phase}`
  );
}
