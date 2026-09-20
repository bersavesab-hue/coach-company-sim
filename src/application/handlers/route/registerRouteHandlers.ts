import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type { CompanyId, RouteId } from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../../core/result/Result.js";
import type { PassengerRoute } from "../../../domain/route/PassengerRoute.js";
import {
  activateRoute,
  createPassengerRoute,
  deactivateRoute,
  updateRouteStops
} from "../../../domain/route/RouteRules.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  ActivateRoutePayload,
  CreateRoutePayload,
  DeactivateRoutePayload,
  UpdateRouteStopsPayload
} from "../../commands/route/RouteCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import { buildOfficialRoutePath } from "../../services/RoutePathService.js";

export interface RouteHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
}

export function registerRouteHandlers(
  commands: CommandBus,
  dependencies: RouteHandlerDependencies
): void {
  commands.register("route.create", (command) =>
    handleCreateRoute(command, dependencies)
  );
  commands.register("route.updateStops", (command) =>
    handleUpdateRouteStops(command, dependencies)
  );
  commands.register("route.activate", (command) =>
    handleActivateRoute(command, dependencies)
  );
  commands.register("route.deactivate", (command) =>
    handleDeactivateRoute(command, dependencies)
  );
}

function handleCreateRoute(
  command: CommandEnvelope,
  dependencies: RouteHandlerDependencies
): Result<PassengerRoute, DomainError> {
  const payload = command.payload as CreateRoutePayload;
  const { repositories } = dependencies;

  const actorCheck = requireActorCompany(command, payload.companyId);
  if (!actorCheck.ok) return actorCheck;

  const company = repositories.companies.getById(payload.companyId);
  if (!company) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Company does not exist",
        { companyId: payload.companyId }
      )
    );
  }

  const existing = repositories.routes.findByCompanyAndCode(
    payload.companyId,
    payload.code.trim()
  );
  if (existing) {
    return err(
      new DomainError(
        "DUPLICATE_ID",
        "Company already has a route with this code",
        {
          companyId: payload.companyId,
          routeCode: payload.code.trim()
        }
      )
    );
  }

  const builtPath = buildOfficialRoutePath(
    payload.orderedStationIds,
    payload.routingPreference,
    repositories.stations,
    repositories.world
  );
  if (!builtPath.ok) return builtPath;

  const created = createPassengerRoute({
    id: dependencies.ids.nextRouteId(),
    company,
    code: payload.code,
    type: payload.routeType,
    stopPoints: builtPath.value.stopPoints,
    pathLegs: builtPath.value.legs,
    routingPreference: payload.routingPreference,
    farePolicyId: payload.farePolicyId,
    requiredLicenseIds: payload.requiredLicenseIds
  });
  if (!created.ok) return created;

  repositories.routes.save(created.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "route.created",
      "route",
      created.value.id,
      {
        routeId: created.value.id,
        companyId: created.value.companyId,
        code: created.value.code,
        stationIds: created.value.stopPoints.map((stop) => stop.stationId)
      }
    )
  );

  return created;
}

function handleUpdateRouteStops(
  command: CommandEnvelope,
  dependencies: RouteHandlerDependencies
): Result<PassengerRoute, DomainError> {
  const payload = command.payload as UpdateRouteStopsPayload;
  const routeResult = requireRoute(payload.routeId, dependencies.repositories);
  if (!routeResult.ok) return routeResult;

  const actorCheck = requireActorCompany(
    command,
    routeResult.value.companyId
  );
  if (!actorCheck.ok) return actorCheck;

  const builtPath = buildOfficialRoutePath(
    payload.orderedStationIds,
    payload.routingPreference,
    dependencies.repositories.stations,
    dependencies.repositories.world
  );
  if (!builtPath.ok) return builtPath;

  const updated = updateRouteStops(
    routeResult.value,
    builtPath.value.stopPoints,
    builtPath.value.legs,
    payload.routingPreference
  );
  if (!updated.ok) return updated;

  dependencies.repositories.routes.save(updated.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "route.stopsUpdated",
      "route",
      updated.value.id,
      {
        routeId: updated.value.id,
        stationIds: updated.value.stopPoints.map((stop) => stop.stationId)
      }
    )
  );

  return updated;
}

function handleActivateRoute(
  command: CommandEnvelope,
  dependencies: RouteHandlerDependencies
): Result<PassengerRoute, DomainError> {
  const payload = command.payload as ActivateRoutePayload;
  const routeResult = requireRoute(payload.routeId, dependencies.repositories);
  if (!routeResult.ok) return routeResult;

  const actorCheck = requireActorCompany(
    command,
    routeResult.value.companyId
  );
  if (!actorCheck.ok) return actorCheck;

  const company = dependencies.repositories.companies.getById(
    routeResult.value.companyId
  );
  if (!company) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Route owner company does not exist",
        { companyId: routeResult.value.companyId }
      )
    );
  }

  const activated = activateRoute(routeResult.value, company);
  if (!activated.ok) return activated;

  dependencies.repositories.routes.save(activated.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "route.activated",
      "route",
      activated.value.id,
      { routeId: activated.value.id }
    )
  );

  return activated;
}

function handleDeactivateRoute(
  command: CommandEnvelope,
  dependencies: RouteHandlerDependencies
): Result<PassengerRoute, DomainError> {
  const payload = command.payload as DeactivateRoutePayload;
  const routeResult = requireRoute(payload.routeId, dependencies.repositories);
  if (!routeResult.ok) return routeResult;

  const actorCheck = requireActorCompany(
    command,
    routeResult.value.companyId
  );
  if (!actorCheck.ok) return actorCheck;

  const deactivated = deactivateRoute(routeResult.value);
  if (!deactivated.ok) return deactivated;

  dependencies.repositories.routes.save(deactivated.value);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "route.deactivated",
      "route",
      deactivated.value.id,
      { routeId: deactivated.value.id }
    )
  );

  return deactivated;
}

function requireRoute(
  routeId: RouteId,
  repositories: RepositoryBundle
): Result<PassengerRoute, DomainError> {
  const route = repositories.routes.getById(routeId);
  return route
    ? ok(route)
    : err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Route does not exist",
          { routeId }
        )
      );
}

function requireActorCompany(
  command: CommandEnvelope,
  expectedCompanyId: CompanyId
): Result<true, DomainError> {
  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== expectedCompanyId
  ) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Command actor does not own the target route/company",
        {
          actorCompanyId: command.actorCompanyId,
          expectedCompanyId
        }
      )
    );
  }

  return ok(true);
}
