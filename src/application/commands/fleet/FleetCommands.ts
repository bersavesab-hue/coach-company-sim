import type {
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";

export interface RepositionFleetPayload {
  readonly vehicleId: VehicleId;
  readonly driverId: StaffId;
  readonly toStationId: StationId;
}

export interface RecoverFleetPayload {
  readonly tripId: TripId;
  readonly recoveryStationId: StationId;
}
