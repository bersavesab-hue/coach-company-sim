import type {
  RouteId,
  ServicePlanId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { DeparturePattern } from "./DeparturePattern.js";
import type { ServiceCalendar } from "./ServiceCalendar.js";

export type ServicePlanStatus = "draft" | "active" | "suspended" | "retired";

export interface ServicePlan {
  readonly id: ServicePlanId;
  readonly routeId: RouteId;
  readonly effectiveFromGameSecond: GameSecond;
  readonly effectiveUntilGameSecond: GameSecond | null;
  readonly calendar: ServiceCalendar;
  readonly departurePattern: DeparturePattern;
  readonly requiredVehicleClass: string;
  readonly status: ServicePlanStatus;
}
