import type { ServicePlanId } from "../../contracts/ids/EntityIds.js";
import type { ServicePlan } from "../../domain/schedule/ServicePlan.js";

export interface ServicePlanRepository {
  getById(id: ServicePlanId): ServicePlan | undefined;
  save(plan: ServicePlan): void;
}
