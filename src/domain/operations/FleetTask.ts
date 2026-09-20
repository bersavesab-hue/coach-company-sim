import type {
  CompanyId,
  FleetTaskId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond, MoneyCents } from "../../core/units/Units.js";
import type { PathLeg } from "../world/RoadPath.js";

export type FleetTaskKind =
  | "deadhead"
  | "refuel"
  | "maintenance"
  | "recovery";

export type FleetTaskStatus = "running" | "completed" | "cancelled";

export interface FleetTask {
  readonly id: FleetTaskId;
  readonly companyId: CompanyId;
  readonly kind: FleetTaskKind;
  readonly status: FleetTaskStatus;
  readonly vehicleId: VehicleId;
  readonly driverId: StaffId | null;
  readonly tripId: TripId | null;
  readonly fromStationId: StationId | null;
  readonly toStationId: StationId | null;
  readonly pathLegs: readonly PathLeg[];
  readonly startedAtGameSecond: GameSecond;
  readonly completesAtGameSecond: GameSecond;
  readonly completedAtGameSecond: GameSecond | null;
  readonly energyUnits: number;
  readonly quotedCostCents: MoneyCents | null;
}
