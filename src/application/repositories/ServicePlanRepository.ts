import type {
  RouteId,
  ServicePlanId
} from "../../contracts/ids/EntityIds.js";
import type { ServicePlan } from "../../domain/schedule/ServicePlan.js";

export interface ServicePlanRepository {
  getById(id: ServicePlanId): ServicePlan | undefined;
  findByRoute(routeId: RouteId): readonly ServicePlan[];
  save(plan: ServicePlan): void;
}
