import type {
  RouteId,
  ServicePlanId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";

export interface DepartureSlot {
  readonly servicePlanId: ServicePlanId;
  readonly routeId: RouteId;
  readonly plannedDepartureGameSecond: GameSecond;
}
