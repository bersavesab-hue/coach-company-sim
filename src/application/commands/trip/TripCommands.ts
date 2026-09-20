import type {
  StaffId,
  ServicePlanId,
  TripId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface PrepareTripPayload {
  readonly servicePlanId: ServicePlanId;
  readonly plannedDepartureGameSecond: GameSecond;
}

export interface AssignTripVehiclePayload {
  readonly tripId: TripId;
  readonly vehicleId: VehicleId;
}

export interface AssignTripDriverPayload {
  readonly tripId: TripId;
  readonly driverId: StaffId;
}

export interface TripByIdPayload {
  readonly tripId: TripId;
}

export interface ResumeTripPayload {
  readonly tripId: TripId;
}
