import type {
  CompanyId,
  FarePolicyId,
  LicenseId,
  RouteId,
  StationId
} from "../../../contracts/ids/EntityIds.js";
import type { RouteType } from "../../../domain/route/RouteType.js";
import type { RoutingPreference } from "../../../domain/world/RoutingCost.js";

export interface CreateRoutePayload {
  readonly companyId: CompanyId;
  readonly code: string;
  readonly routeType: RouteType;
  readonly orderedStationIds: readonly StationId[];
  readonly routingPreference: RoutingPreference;
  readonly farePolicyId: FarePolicyId;
  readonly requiredLicenseIds: readonly LicenseId[];
}

export interface UpdateRouteStopsPayload {
  readonly routeId: RouteId;
  readonly orderedStationIds: readonly StationId[];
  readonly routingPreference: RoutingPreference;
}

export interface ActivateRoutePayload {
  readonly routeId: RouteId;
}

export interface DeactivateRoutePayload {
  readonly routeId: RouteId;
}
