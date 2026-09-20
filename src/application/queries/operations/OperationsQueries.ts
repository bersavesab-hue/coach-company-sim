import type { CompanyId } from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface PlanDayOperationsQuery {
  readonly type: "operations.planDay";
  readonly payload: {
    readonly companyId: CompanyId;
    readonly gameDay: number;
    readonly generatedAtGameSecond: GameSecond;
  };
}

export interface CommittedDayOperationsQuery {
  readonly type: "operations.committedDay";
  readonly payload: {
    readonly companyId: CompanyId;
    readonly gameDay: number;
  };
}

export interface DispatchCenterQuery {
  readonly type: "operations.dispatchCenter";
  readonly payload: {
    readonly companyId: CompanyId;
    readonly gameDay: number;
    readonly currentGameSecond: GameSecond;
  };
}
