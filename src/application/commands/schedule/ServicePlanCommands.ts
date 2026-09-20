import type {
  RouteId,
  ServicePlanId
} from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";
import type { DeparturePattern } from "../../../domain/schedule/DeparturePattern.js";
import type { ServiceCalendar } from "../../../domain/schedule/ServiceCalendar.js";

export interface CreateServicePlanPayload {
  readonly routeId: RouteId;
  readonly effectiveFromGameSecond: GameSecond;
  readonly effectiveUntilGameSecond: GameSecond | null;
  readonly calendar: ServiceCalendar;
  readonly departurePattern: DeparturePattern;
  readonly requiredVehicleClass: string;
}

export interface UpdateServicePlanPayload {
  readonly servicePlanId: ServicePlanId;
  readonly effectiveFromGameSecond: GameSecond;
  readonly effectiveUntilGameSecond: GameSecond | null;
  readonly calendar: ServiceCalendar;
  readonly departurePattern: DeparturePattern;
  readonly requiredVehicleClass: string;
}

export interface CancelServicePlanPayload {
  readonly servicePlanId: ServicePlanId;
}
