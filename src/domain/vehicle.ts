import type { WorldPoint } from "./map.js";

export type VehicleStatus = "idle" | "running" | "maintenance";

export interface Vehicle {
  id: string;
  fleetNo: string;
  modelId: string;

  seats: number;
  standingCapacity: number;

  fuelPermille: number;
  conditionPermille: number;
  mileageM: number;

  status: VehicleStatus;
  routeId: string | null;
  routeSegmentIndex: number;
  offsetOnSegmentM: number;

  cruiseSpeedMps: number;
  passengers: number;
  worldPosition: WorldPoint;
}
