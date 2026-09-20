import type {
  CompanyId,
  RouteId,
  ServicePlanId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  GameSecond
} from "../../core/units/Units.js";

export type PlannedOperationKind =
  | "passenger_trip"
  | "deadhead"
  | "refuel"
  | "maintenance"
  | "rest";

export interface PlannedOperationAction {
  readonly sequence: number;
  readonly kind: PlannedOperationKind;
  readonly startsAtGameSecond: GameSecond;
  readonly endsAtGameSecond: GameSecond;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly routeId: RouteId | null;
  readonly servicePlanId: ServicePlanId | null;
  readonly existingTripId: TripId | null;
  readonly fromStationId: StationId | null;
  readonly toStationId: StationId | null;
  readonly distanceM: DistanceM;
  readonly energyUnits: number;
}

export type PlannedTripCoverage =
  | "covered"
  | "uncovered"
  | "locked_existing";

export interface PlannedTripAssignment {
  readonly servicePlanId: ServicePlanId;
  readonly routeId: RouteId;
  readonly existingTripId: TripId | null;
  readonly plannedDepartureGameSecond: GameSecond;
  readonly estimatedArrivalGameSecond: GameSecond;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly coverage: PlannedTripCoverage;
}

export type OperationsPlanIssueCode =
  | "NO_VEHICLE"
  | "NO_DRIVER"
  | "NO_RESOURCE_PAIR"
  | "RESOURCE_STATE_UNKNOWN"
  | "ROUTE_INVALID"
  | "EXISTING_TRIP_LOCKED";

export interface OperationsPlanIssue {
  readonly code: OperationsPlanIssueCode;
  readonly servicePlanId: ServicePlanId;
  readonly routeId: RouteId;
  readonly plannedDepartureGameSecond: GameSecond;
  readonly message: string;
}

export interface DayOperationsPlanStats {
  readonly requestedTrips: number;
  readonly coveredTrips: number;
  readonly uncoveredTrips: number;
  readonly vehiclesUsed: number;
  readonly driversUsed: number;
  readonly deadheadDistanceM: DistanceM;
  readonly supportSeconds: number;
}

export interface DayOperationsPlan {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly generatedAtGameSecond: GameSecond;
  readonly tripAssignments: readonly PlannedTripAssignment[];
  readonly actions: readonly PlannedOperationAction[];
  readonly issues: readonly OperationsPlanIssue[];
  readonly stats: DayOperationsPlanStats;
}
