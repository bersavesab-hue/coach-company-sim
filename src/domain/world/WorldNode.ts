import type { WorldNodeId } from "../../contracts/ids/EntityIds.js";
import type { WorldPoint } from "./WorldPoint.js";

export type WorldNodeType =
  | "city"
  | "county"
  | "town"
  | "village"
  | "junction"
  | "bus_station"
  | "industrial_park"
  | "scenic_area"
  | "airport"
  | "rail_station";

export interface WorldNode {
  readonly id: WorldNodeId;
  readonly type: WorldNodeType;
  readonly name: string;
  readonly position: WorldPoint;
  readonly active: boolean;
}
