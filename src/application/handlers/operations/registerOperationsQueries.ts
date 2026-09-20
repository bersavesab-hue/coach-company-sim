import type { QueryBus } from "../../QueryBus.js";
import type { DayOperationsPlanner } from "../../services/DayOperationsPlanner.js";
import type { PlanDayOperationsQuery } from "../../queries/operations/OperationsQueries.js";

export function registerOperationsQueries(
  queries: QueryBus,
  planner: DayOperationsPlanner
): void {
  queries.register("operations.planDay", (query) =>
    planner.planCompanyDay(
      (query as PlanDayOperationsQuery).payload
    )
  );
}
