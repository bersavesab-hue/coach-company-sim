import type {
  CompanyId,
  TripId
} from "../../../contracts/ids/EntityIds.js";

export interface CompanyFinanceSnapshotQuery {
  readonly type: "finance.companySnapshot";
  readonly payload: {
    readonly companyId: CompanyId;
  };
}

export interface TripEconomicsQuery {
  readonly type: "finance.tripEconomics";
  readonly payload: {
    readonly tripId: TripId;
  };
}
