import type {
  CompanyId,
  FarePolicyId,
  LicenseId,
  RoadSegmentId,
  RouteId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type { RouteType } from "./RouteType.js";

export type RouteStatus = "draft" | "active" | "suspended" | "retired";

export interface PassengerRoute {
  readonly id: RouteId;
  readonly companyId: CompanyId;
  readonly code: string;
  readonly type: RouteType;
  readonly orderedStationIds: readonly StationId[];
  readonly roadPathSegmentIds: readonly RoadSegmentId[];
  readonly farePolicyId: FarePolicyId;
  readonly requiredLicenseIds: readonly LicenseId[];
  readonly status: RouteStatus;
}
