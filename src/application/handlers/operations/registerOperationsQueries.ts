import { ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type {
  CommittedDayOperationsQuery,
  DispatchCenterQuery,
  PlanDayOperationsQuery
} from "../../queries/operations/OperationsQueries.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type { DayOperationsPlanner } from "../../services/DayOperationsPlanner.js";
import type { DispatchCenterProjection } from "../../services/DispatchCenterProjection.js";

export function registerOperationsQueries(
  queries: QueryBus,
  planner: DayOperationsPlanner,
  repositories: RepositoryBundle,
  dispatchCenter: DispatchCenterProjection
): void {
  queries.register("operations.planDay", (query) =>
    planner.planCompanyDay(
      (query as PlanDayOperationsQuery).payload
    )
  );

  queries.register("operations.committedDay", (query) => {
    const typed = query as CommittedDayOperationsQuery;
    return ok(
      repositories.operationsSchedules.getByCompanyAndDay(
        typed.payload.companyId,
        typed.payload.gameDay
      ) ?? null
    );
  });

  queries.register("operations.dispatchCenter", (query) => {
    const typed = query as DispatchCenterQuery;
    return ok(
      dispatchCenter.build(typed.payload)
    );
  });
}
