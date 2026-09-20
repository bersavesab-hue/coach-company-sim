import type {
  RouteId,
  ServicePlanId,
  TripId
} from "../../contracts/ids/EntityIds.js";

export interface RuntimeIdAllocator {
  nextRouteId(): RouteId;
  nextServicePlanId(): ServicePlanId;
  nextTripId(): TripId;
}
