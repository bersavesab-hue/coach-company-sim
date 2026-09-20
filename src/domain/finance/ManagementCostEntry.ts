import type {
  CompanyId,
  EventId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents
} from "../../core/units/Units.js";

export type ManagementCostCategory =
  | "maintenance_wear"
  | "economic_depreciation";

export interface ManagementCostEntry {
  readonly sourceRef: string;
  readonly sourceEventId: EventId;
  readonly companyId: CompanyId;
  readonly tripId: TripId;
  readonly gameSecond: GameSecond;
  readonly category: ManagementCostCategory;
  readonly amountCents: MoneyCents;
}
