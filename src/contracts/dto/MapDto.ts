import type {
  RouteId,
  TripId,
  VehicleId
} from "../ids/EntityIds.js";

export interface VisibleVehicleDto {
  readonly tripId: TripId;
  readonly vehicleId: VehicleId;
  readonly routeId: RouteId;
  readonly xM: number;
  readonly yM: number;
}
