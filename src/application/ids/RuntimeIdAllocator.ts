import type {
  FleetTaskId,
  RouteId,
  ServicePlanId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";

export interface RuntimeIdAllocator {
  nextRouteId(): RouteId;
  nextServicePlanId(): ServicePlanId;
  nextTripId(): TripId;
  nextFleetTaskId(): FleetTaskId;
  nextVehicleId(): VehicleId;
}
