import type {
  CompanyId,
  FarePolicyId,
  LicenseId,
  RouteId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type { PathLeg } from "../world/RoadPath.js";
import type { RoutingPreference } from "../world/RoutingCost.js";
import type { RouteType } from "./RouteType.js";

export type RouteStatus = "draft" | "active" | "suspended" | "retired";

export interface PassengerRoute {
  readonly id: RouteId;
  readonly companyId: CompanyId;
  readonly code: string;
  readonly type: RouteType;
  readonly orderedStationIds: readonly StationId[];
  readonly pathLegs: readonly PathLeg[];
  readonly routingPreference: RoutingPreference;
  readonly farePolicyId: FarePolicyId;
  readonly requiredLicenseIds: readonly LicenseId[];
  readonly status: RouteStatus;
}
