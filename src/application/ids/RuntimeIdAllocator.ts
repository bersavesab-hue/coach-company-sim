import type {
  RouteId,
  ServicePlanId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";

export interface RuntimeIdAllocator {
  nextRouteId(): RouteId;
  nextServicePlanId(): ServicePlanId;
  nextTripId(): TripId;
  nextVehicleId(): VehicleId;
}
