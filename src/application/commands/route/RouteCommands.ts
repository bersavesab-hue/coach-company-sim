import type {
  CompanyId,
  FarePolicyId,
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
}

export interface UpdateRouteStopsPayload {
  readonly routeId: RouteId;
  readonly orderedStationIds: readonly StationId[];
  readonly routingPreference: RoutingPreference;
}

export interface SetRouteFarePayload {
  readonly routeId: RouteId;
  readonly fareMultiplierPermille: number;
}

export interface ActivateRoutePayload {
  readonly routeId: RouteId;
}

export interface DeactivateRoutePayload {
  readonly routeId: RouteId;
}
