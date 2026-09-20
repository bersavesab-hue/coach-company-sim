import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type { DomainError } from "../../../core/errors/DomainError.js";
import type { Result } from "../../../core/result/Result.js";
import type { CommittedOperationsSchedule } from "../../../domain/operations/CommittedOperationsSchedule.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  CommitDayOperationsPayload,
  CompleteDriverRestPayload,
  ReplanDayOperationsPayload,
  StartDriverRestPayload
} from "../../commands/operations/OperationsCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { OperationsScheduleService } from "../../operations/OperationsScheduleService.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import { err, ok } from "../../../core/result/Result.js";
import { DomainError as ErrorValue } from "../../../core/errors/DomainError.js";

export function registerOperationsHandlers(
  commands: CommandBus,
  repositories: RepositoryBundle,
  events: DomainEventBus,
  schedules: OperationsScheduleService
): void {
  commands.register("operations.commitDayPlan", (command) =>
    schedules.commitDay(
      command,
      command.payload as CommitDayOperationsPayload
    )
  );

  commands.register("operations.replanDay", (command) =>
    schedules.replanDay(
      command,
      command.payload as ReplanDayOperationsPayload
    )
  );

  commands.register("driver.startRest", (command) =>
    startDriverRest(command, repositories, events)
  );

  commands.register("driver.completeRest", (command) =>
    completeDriverRest(command, repositories, events)
  );
}

function startDriverRest(
  command: CommandEnvelope,
  repositories: RepositoryBundle,
  events: DomainEventBus
): Result<unknown, DomainError> {
  const payload = command.payload as StartDriverRestPayload;
  const driver = repositories.staff.getDriverById(payload.driverId);
  if (!driver) {
    return err(
      new ErrorValue(
        "ENTITY_NOT_FOUND",
        "Driver does not exist",
        { driverId: payload.driverId }
      )
    );
  }

  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== driver.companyId
  ) {
    return err(
      new ErrorValue(
        "INVALID_ARGUMENT",
        "Command actor does not own this driver"
      )
    );
  }

  if (
    driver.status !== "available" ||
    driver.activeTripId !== null ||
    driver.activeFleetTaskId !== null ||
    driver.currentStationId === null ||
    Number(driver.availableAtGameSecond) >
      Number(command.issuedAtGameSecond)
  ) {
    return err(
      new ErrorValue(
        "DRIVER_NOT_AVAILABLE",
        "Driver cannot begin scheduled rest",
        { driverId: driver.id, status: driver.status }
      )
    );
  }

  if (
    Number(payload.restUntilGameSecond) <=
    Number(command.issuedAtGameSecond)
  ) {
    return err(
      new ErrorValue(
        "INVALID_ARGUMENT",
        "Driver rest must end after it starts"
      )
    );
  }

  const updated = {
    ...driver,
    status: "off_duty" as const,
    availableAtGameSecond: payload.restUntilGameSecond,
    lastDutyEndedAtGameSecond: command.issuedAtGameSecond
  };
  repositories.staff.saveDriver(updated);

  events.publish(
    createDomainEvent(
      command,
      "driver.restStarted",
      "staff",
      driver.id,
      {
        driverId: driver.id,
        restUntilGameSecond: payload.restUntilGameSecond
      }
    )
  );
  return ok(updated);
}

function completeDriverRest(
  command: CommandEnvelope,
  repositories: RepositoryBundle,
  events: DomainEventBus
): Result<unknown, DomainError> {
  const payload = command.payload as CompleteDriverRestPayload;
  const driver = repositories.staff.getDriverById(payload.driverId);
  if (!driver) {
    return err(
      new ErrorValue(
        "ENTITY_NOT_FOUND",
        "Driver does not exist",
        { driverId: payload.driverId }
      )
    );
  }

  if (
    driver.status !== "off_duty" ||
    Number(command.issuedAtGameSecond) <
      Number(driver.availableAtGameSecond)
  ) {
    return err(
      new ErrorValue(
        "DRIVER_NOT_AVAILABLE",
        "Driver rest has not completed",
        { driverId: driver.id }
      )
    );
  }

  const updated = {
    ...driver,
    status: "available" as const,
    dutyStartedAtGameSecond: null,
    continuousDrivingSeconds: 0
  };
  repositories.staff.saveDriver(updated);

  events.publish(
    createDomainEvent(
      command,
      "driver.restCompleted",
      "staff",
      driver.id,
      { driverId: driver.id }
    )
  );
  return ok(updated);
}
