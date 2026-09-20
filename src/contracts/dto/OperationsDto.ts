import type {
  CompanyId,
  FleetTaskId,
  RouteId,
  StaffId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../ids/EntityIds.js";
import type { ErrorCode } from "../../core/errors/ErrorCode.js";
import type { OperationsPlanIssueCode } from "../../domain/operations/DayOperationsPlan.js";
import type {
  OperationsScheduleStatus,
  ScheduledOperationStatus
} from "../../domain/operations/CommittedOperationsSchedule.js";
import type { PlannedOperationKind } from "../../domain/operations/DayOperationsPlan.js";
import type { TripStatus } from "../../domain/trip/TripStatus.js";
import type { VehicleStatus } from "../../domain/vehicle/VehicleStatus.js";
import type { VehicleIncidentKind } from "../../domain/vehicle/VehicleIncident.js";
import type { DriverStatus } from "../../domain/staff/Driver.js";

export interface DispatchCenterScheduleDto {
  readonly committed: boolean;
  readonly revision: number | null;
  readonly status: OperationsScheduleStatus | "not_committed";
  readonly committedAtGameSecond: number | null;
  readonly generatedAtGameSecond: number | null;
  readonly replanAtGameSecond: number | null;
}

export interface DispatchCenterTripDto {
  readonly sequence: number | null;
  readonly tripId: TripId;
  readonly routeId: RouteId;
  readonly routeCode: string;
  readonly originStationId: StationId | null;
  readonly originStationName: string | null;
  readonly destinationStationId: StationId | null;
  readonly destinationStationName: string | null;
  readonly plannedDepartureGameSecond: number;
  readonly actualDepartureGameSecond: number | null;
  readonly actualArrivalGameSecond: number | null;
  readonly scheduledEndGameSecond: number | null;
  readonly tripStatus: TripStatus;
  readonly operationStatus: ScheduledOperationStatus | null;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly delaySeconds: number;
  readonly recoveryStationId: StationId | null;
  readonly activeIncident: VehicleIncidentKind | null;
  readonly failureCode: ErrorCode | null;
}

export interface DispatchCenterSupportDto {
  readonly sequence: number;
  readonly kind: Exclude<PlannedOperationKind, "passenger_trip">;
  readonly status: ScheduledOperationStatus;
  readonly startsAtGameSecond: number;
  readonly endsAtGameSecond: number;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly fleetTaskId: FleetTaskId | null;
  readonly fromStationId: StationId | null;
  readonly fromStationName: string | null;
  readonly toStationId: StationId | null;
  readonly toStationName: string | null;
  readonly distanceM: number;
  readonly energyUnits: number;
  readonly failureCode: ErrorCode | null;
}

export interface DispatchCenterVehicleDto {
  readonly vehicleId: VehicleId;
  readonly modelId: VehicleModelId;
  readonly serviceClass: string;
  readonly status: VehicleStatus;
  readonly currentStationId: StationId | null;
  readonly currentStationName: string | null;
  readonly availableAtGameSecond: number;
  readonly energyUnits: number;
  readonly energyCapacityUnits: number;
  readonly energyPermille: number;
  readonly mileageM: number;
  readonly kilometersUntilMaintenance: number;
  readonly powertrainConditionPermille: number;
  readonly brakeConditionPermille: number;
  readonly tireConditionPermille: number;
  readonly insuranceValid: boolean;
  readonly inspectionValid: boolean;
  readonly activeIncident: VehicleIncidentKind | null;
  readonly activeTripId: TripId | null;
  readonly activeFleetTaskId: FleetTaskId | null;
  readonly nextOperationSequence: number | null;
  readonly nextOperationKind: PlannedOperationKind | null;
  readonly nextOperationGameSecond: number | null;
}

export interface DispatchCenterDriverDto {
  readonly driverId: StaffId;
  readonly name: string;
  readonly status: DriverStatus;
  readonly currentStationId: StationId | null;
  readonly currentStationName: string | null;
  readonly availableAtGameSecond: number;
  readonly dutyStartedAtGameSecond: number | null;
  readonly continuousDrivingSeconds: number;
  readonly activeTripId: TripId | null;
  readonly activeFleetTaskId: FleetTaskId | null;
  readonly nextOperationSequence: number | null;
  readonly nextOperationKind: PlannedOperationKind | null;
  readonly nextOperationGameSecond: number | null;
}

export interface DispatchCenterShortageDto {
  readonly code: Extract<
    OperationsPlanIssueCode,
    "NO_VEHICLE" | "NO_DRIVER" | "NO_RESOURCE_PAIR"
  >;
  readonly routeId: RouteId;
  readonly routeCode: string;
  readonly plannedDepartureGameSecond: number;
  readonly message: string;
}

export interface DispatchCenterSummaryDto {
  readonly passengerTripsTotal: number;
  readonly passengerTripsPlanned: number;
  readonly passengerTripsBoarding: number;
  readonly passengerTripsRunning: number;
  readonly passengerTripsDisrupted: number;
  readonly passengerTripsCompleted: number;
  readonly passengerTripsFailed: number;
  readonly delayedTrips: number;
  readonly maxDelaySeconds: number;
  readonly supportActionsTotal: number;
  readonly supportActionsRunning: number;
  readonly supportActionsFailed: number;
  readonly shortageTrips: number;
  readonly fleetTotal: number;
  readonly fleetAvailable: number;
  readonly fleetRunning: number;
  readonly fleetBroken: number;
  readonly fleetInSupport: number;
  readonly driversTotal: number;
  readonly driversAvailable: number;
  readonly driversDriving: number;
  readonly driversResting: number;
}

export interface DispatchCenterDto {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly currentGameSecond: number;
  readonly schedule: DispatchCenterScheduleDto;
  readonly summary: DispatchCenterSummaryDto;
  readonly trips: readonly DispatchCenterTripDto[];
  readonly support: readonly DispatchCenterSupportDto[];
  readonly vehicles: readonly DispatchCenterVehicleDto[];
  readonly drivers: readonly DispatchCenterDriverDto[];
  readonly shortages: readonly DispatchCenterShortageDto[];
}
