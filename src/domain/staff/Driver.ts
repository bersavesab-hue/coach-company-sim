import type {
  CompanyId,
  StaffId,
  TripId
} from "../../contracts/ids/EntityIds.js";

export type DriverStatus =
  | "available"
  | "assigned"
  | "driving"
  | "off_duty"
  | "suspended";

export interface Driver {
  readonly id: StaffId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly status: DriverStatus;
  readonly qualifiedVehicleClasses: readonly string[];
  readonly activeTripId: TripId | null;
}
