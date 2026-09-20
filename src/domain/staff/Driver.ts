import type {
  CompanyId,
  FleetTaskId,
  StaffId,
  StationId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";

export type DriverStatus =
  | "available"
  | "assigned"
  | "driving"
  | "repositioning"
  | "off_duty"
  | "suspended";

export interface Driver {
  readonly id: StaffId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly status: DriverStatus;
  readonly qualifiedVehicleClasses: readonly string[];
  readonly currentStationId: StationId | null;
  readonly availableAtGameSecond: GameSecond;
  readonly dutyStartedAtGameSecond: GameSecond | null;
  readonly lastDutyEndedAtGameSecond: GameSecond | null;
  readonly continuousDrivingSeconds: number;
  readonly activeTripId: TripId | null;
  readonly activeFleetTaskId: FleetTaskId | null;
}
