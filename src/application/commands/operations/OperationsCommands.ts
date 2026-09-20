import type {
  CompanyId,
  StaffId
} from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface CommitDayOperationsPayload {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly allowPartial: boolean;
}

export interface ReplanDayOperationsPayload {
  readonly companyId: CompanyId;
  readonly gameDay: number;
}

export interface StartDriverRestPayload {
  readonly driverId: StaffId;
  readonly restUntilGameSecond: GameSecond;
}

export interface CompleteDriverRestPayload {
  readonly driverId: StaffId;
}
