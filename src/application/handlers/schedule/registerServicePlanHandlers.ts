import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type { ServicePlanId } from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, type Result } from "../../../core/result/Result.js";
import type { ServicePlan } from "../../../domain/schedule/ServicePlan.js";
import {
  cancelServicePlan,
  createServicePlan,
  updateServicePlan
} from "../../../domain/schedule/ServicePlanRules.js";
import type { CommandBus } from "../../CommandBus.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type {
  CancelServicePlanPayload,
  CreateServicePlanPayload,
  UpdateServicePlanPayload
} from "../../commands/schedule/ServicePlanCommands.js";

export interface ServicePlanHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
}

export function registerServicePlanHandlers(
  commands: CommandBus,
  dependencies: ServicePlanHandlerDependencies
): void {
  commands.register("servicePlan.create", (command) =>
    handleCreate(command, dependencies)
  );
  commands.register("servicePlan.update", (command) =>
    handleUpdate(command, dependencies)
  );
  commands.register("servicePlan.cancel", (command) =>
    handleCancel(command, dependencies)
  );
}

function handleCreate(
  command: CommandEnvelope,
  dependencies: ServicePlanHandlerDependencies
): Result<ServicePlan, DomainError> {
  const payload = command.payload as CreateServicePlanPayload;
  const route = dependencies.repositories.routes.getById(payload.routeId);

  if (!route) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Route does not exist",
        { routeId: payload.routeId }
      )
    );
  }

  if (route.status !== "active") {
    return err(
      new DomainError(
        "ROUTE_INACTIVE",
        "Service plan requires an active route",
        { routeId: route.id, status: route.status }
      )
    );
  }

  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== route.companyId
  ) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Command actor does not own the route",
        { routeId: route.id }
      )
    );
  }

  const created = createServicePlan({
    id: dependencies.ids.nextServicePlanId(),
    routeId: route.id,
    effectiveFromGameSecond: payload.effectiveFromGameSecond,
    effectiveUntilGameSecond: payload.effectiveUntilGameSecond,
    calendar: payload.calendar,
    departurePattern: payload.departurePattern,
    requiredVehicleClass: payload.requiredVehicleClass
  });
  if (!created.ok) return created;

  dependencies.repositories.servicePlans.save(created.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "servicePlan.created",
      "servicePlan",
      created.value.id,
      {
        servicePlanId: created.value.id,
        routeId: created.value.routeId
      }
    )
  );

  return created;
}

function handleUpdate(
  command: CommandEnvelope,
  dependencies: ServicePlanHandlerDependencies
): Result<ServicePlan, DomainError> {
  const payload = command.payload as UpdateServicePlanPayload;
  const planResult = requirePlan(payload.servicePlanId, dependencies.repositories);
  if (!planResult.ok) return planResult;

  const route = dependencies.repositories.routes.getById(planResult.value.routeId);
  if (!route) {
    return err(
      new DomainError("ENTITY_NOT_FOUND", "Service plan route does not exist")
    );
  }

  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== route.companyId
  ) {
    return err(
      new DomainError("INVALID_ARGUMENT", "Command actor does not own the route")
    );
  }

  const updated = updateServicePlan(planResult.value, {
    effectiveFromGameSecond: payload.effectiveFromGameSecond,
    effectiveUntilGameSecond: payload.effectiveUntilGameSecond,
    calendar: payload.calendar,
    departurePattern: payload.departurePattern,
    requiredVehicleClass: payload.requiredVehicleClass
  });
  if (!updated.ok) return updated;

  dependencies.repositories.servicePlans.save(updated.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "servicePlan.updated",
      "servicePlan",
      updated.value.id,
      { servicePlanId: updated.value.id }
    )
  );

  return updated;
}

function handleCancel(
  command: CommandEnvelope,
  dependencies: ServicePlanHandlerDependencies
): Result<ServicePlan, DomainError> {
  const payload = command.payload as CancelServicePlanPayload;
  const planResult = requirePlan(payload.servicePlanId, dependencies.repositories);
  if (!planResult.ok) return planResult;

  const route = dependencies.repositories.routes.getById(planResult.value.routeId);
  if (!route) {
    return err(
      new DomainError("ENTITY_NOT_FOUND", "Service plan route does not exist")
    );
  }

  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== route.companyId
  ) {
    return err(
      new DomainError("INVALID_ARGUMENT", "Command actor does not own the route")
    );
  }

  const cancelled = cancelServicePlan(planResult.value);
  if (!cancelled.ok) return cancelled;

  dependencies.repositories.servicePlans.save(cancelled.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "servicePlan.cancelled",
      "servicePlan",
      cancelled.value.id,
      { servicePlanId: cancelled.value.id }
    )
  );

  return cancelled;
}

function requirePlan(
  servicePlanId: ServicePlanId,
  repositories: RepositoryBundle
): Result<ServicePlan, DomainError> {
  const plan = repositories.servicePlans.getById(servicePlanId);
  return plan
    ? { ok: true, value: plan }
    : err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Service plan does not exist",
          { servicePlanId }
        )
      );
}
