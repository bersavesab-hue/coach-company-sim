import type { Company } from "../company/Company.js";
import type { PathLeg } from "../world/RoadPath.js";
import type { RoutingPreference } from "../world/RoutingCost.js";
import type {
  FarePolicyId,
  LicenseId,
  RouteId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { PassengerRoute } from "./PassengerRoute.js";
import type { RouteType } from "./RouteType.js";

export interface CreatePassengerRouteInput {
  readonly id: RouteId;
  readonly company: Company;
  readonly code: string;
  readonly type: RouteType;
  readonly orderedStationIds: readonly StationId[];
  readonly pathLegs: readonly PathLeg[];
  readonly routingPreference: RoutingPreference;
  readonly farePolicyId: FarePolicyId;
  readonly requiredLicenseIds: readonly LicenseId[];
}

export function createPassengerRoute(
  input: CreatePassengerRouteInput
): Result<PassengerRoute, DomainError> {
  const code = input.code.trim();

  if (input.company.status !== "active") {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Only an active company can create routes",
        { companyId: input.company.id }
      )
    );
  }

  if (code.length === 0) {
    return err(
      new DomainError("ROUTE_INVALID", "Route code cannot be empty")
    );
  }

  if (input.orderedStationIds.length < 2) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "A passenger route requires at least two stations"
      )
    );
  }

  if (new Set(input.orderedStationIds).size !== input.orderedStationIds.length) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "A passenger route cannot contain duplicate stations"
      )
    );
  }

  if (input.pathLegs.length === 0) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "A passenger route requires a non-empty road path"
      )
    );
  }

  return ok({
    id: input.id,
    companyId: input.company.id,
    code,
    type: input.type,
    orderedStationIds: [...input.orderedStationIds],
    pathLegs: [...input.pathLegs],
    routingPreference: input.routingPreference,
    farePolicyId: input.farePolicyId,
    requiredLicenseIds: [...input.requiredLicenseIds],
    status: "draft"
  });
}

export function updateRouteStops(
  route: PassengerRoute,
  orderedStationIds: readonly StationId[],
  pathLegs: readonly PathLeg[],
  routingPreference: RoutingPreference
): Result<PassengerRoute, DomainError> {
  if (route.status === "retired") {
    return err(
      new DomainError(
        "ROUTE_INACTIVE",
        "A retired route cannot be edited",
        { routeId: route.id }
      )
    );
  }

  if (orderedStationIds.length < 2 || pathLegs.length === 0) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Updated route requires at least two stations and a road path"
      )
    );
  }

  if (new Set(orderedStationIds).size !== orderedStationIds.length) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Updated route cannot contain duplicate stations"
      )
    );
  }

  return ok({
    ...route,
    orderedStationIds: [...orderedStationIds],
    pathLegs: [...pathLegs],
    routingPreference
  });
}

export function activateRoute(
  route: PassengerRoute,
  company: Company
): Result<PassengerRoute, DomainError> {
  if (route.status !== "draft" && route.status !== "suspended") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only draft or suspended routes can be activated",
        { routeId: route.id, status: route.status }
      )
    );
  }

  const companyLicenses = new Set(company.licenseIds);
  const missing = route.requiredLicenseIds.filter(
    (licenseId) => !companyLicenses.has(licenseId)
  );

  if (missing.length > 0) {
    return err(
      new DomainError(
        "LICENSE_REQUIRED",
        "Company is missing licenses required by route",
        { routeId: route.id, missingLicenseIds: missing }
      )
    );
  }

  return ok({ ...route, status: "active" });
}

export function deactivateRoute(
  route: PassengerRoute
): Result<PassengerRoute, DomainError> {
  if (route.status !== "active") {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        "Only an active route can be deactivated",
        { routeId: route.id, status: route.status }
      )
    );
  }

  return ok({ ...route, status: "suspended" });
}
