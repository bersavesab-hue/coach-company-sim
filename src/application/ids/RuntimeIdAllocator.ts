import type { RouteId } from "../../contracts/ids/EntityIds.js";

export interface RuntimeIdAllocator {
  nextRouteId(): RouteId;
}
