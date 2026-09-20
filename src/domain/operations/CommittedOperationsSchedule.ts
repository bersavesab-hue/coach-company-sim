import type {
  CompanyId,
  FleetTaskId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { ErrorCode } from "../../core/errors/ErrorCode.js";
import type {
  DistanceM,
  GameSecond
} from "../../core/units/Units.js";
import type {
  PlannedOperationKind
} from "./DayOperationsPlan.js";

export type ScheduledOperationStatus =
  | "planned"
  | "boarding"
  | "started"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScheduledOperation {
  readonly sequence: number;
  readonly kind: PlannedOperationKind;
  readonly startsAtGameSecond: GameSecond;
  readonly endsAtGameSecond: GameSecond;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly tripId: TripId | null;
  readonly fleetTaskId: FleetTaskId | null;
  readonly fromStationId: StationId | null;
  readonly toStationId: StationId | null;
  readonly distanceM: DistanceM;
  readonly energyUnits: number;
  readonly status: ScheduledOperationStatus;
  readonly failureCode: ErrorCode | null;
}

export type OperationsScheduleStatus =
  | "active"
  | "replan_required"
  | "completed"
  | "cancelled";

export interface CommittedOperationsSchedule {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly revision: number;
  readonly committedAtGameSecond: GameSecond;
  readonly generatedAtGameSecond: GameSecond;
  readonly status: OperationsScheduleStatus;
  readonly replanAtGameSecond: GameSecond | null;
  readonly actions: readonly ScheduledOperation[];
}
