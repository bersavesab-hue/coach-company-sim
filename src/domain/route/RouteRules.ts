import type {
  FarePolicyId,
  LicenseId,
  RouteId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { Company } from "../company/Company.js";
import type { PathLeg } from "../world/RoadPath.js";
import type { RoutingPreference } from "../world/RoutingCost.js";
import type { PassengerRoute } from "./PassengerRoute.js";
import type { RouteStopPoint } from "./RouteStopPoint.js";
import type { RouteType } from "./RouteType.js";

export interface CreatePassengerRouteInput {
  readonly id: RouteId;
  readonly company: Company;
  readonly code: string;
  readonly type: RouteType;
  readonly stopPoints: readonly RouteStopPoint[];
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

  const validation = validateRouteShape(input.stopPoints, input.pathLegs);
  if (!validation.ok) return validation;

  return ok({
    id: input.id,
    companyId: input.company.id,
    code,
    type: input.type,
    stopPoints: input.stopPoints.map((stop) => ({ ...stop })),
    pathLegs: [...input.pathLegs],
    routingPreference: input.routingPreference,
    farePolicyId: input.farePolicyId,
    requiredLicenseIds: [...input.requiredLicenseIds],
    status: "draft"
  });
}

export function updateRouteStops(
  route: PassengerRoute,
  stopPoints: readonly RouteStopPoint[],
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

  const validation = validateRouteShape(stopPoints, pathLegs);
  if (!validation.ok) return validation;

  return ok({
    ...route,
    stopPoints: stopPoints.map((stop) => ({ ...stop })),
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

function validateRouteShape(
  stopPoints: readonly RouteStopPoint[],
  pathLegs: readonly PathLeg[]
): Result<true, DomainError> {
  if (stopPoints.length < 2 || pathLegs.length === 0) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Route requires at least two stops and a non-empty road path"
      )
    );
  }

  if (
    new Set(stopPoints.map((stop) => stop.stationId)).size !==
    stopPoints.length
  ) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Route cannot contain duplicate stations"
      )
    );
  }

  if (stopPoints[0]?.pathLegBoundaryIndex !== 0) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "First route stop must be at path boundary 0"
      )
    );
  }

  if (
    stopPoints.at(-1)?.pathLegBoundaryIndex !== pathLegs.length
  ) {
    return err(
      new DomainError(
        "ROUTE_INVALID",
        "Final route stop must be at the final path boundary"
      )
    );
  }

  let previousBoundary = -1;
  for (const stop of stopPoints) {
    if (
      !Number.isSafeInteger(stop.pathLegBoundaryIndex) ||
      stop.pathLegBoundaryIndex < 0 ||
      stop.pathLegBoundaryIndex > pathLegs.length ||
      stop.pathLegBoundaryIndex <= previousBoundary
    ) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Route stop path boundaries must be strictly increasing"
        )
      );
    }
    previousBoundary = stop.pathLegBoundaryIndex;
  }

  return ok(true);
}
