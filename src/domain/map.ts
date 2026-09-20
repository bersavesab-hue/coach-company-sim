export type MapNodeType =
  | "city"
  | "county"
  | "town"
  | "village"
  | "bus_station"
  | "industrial_park"
  | "scenic_area"
  | "airport"
  | "rail_station";

export interface WorldPoint {
  xM: number;
  yM: number;
}

export interface MapNode {
  id: string;
  name: string;
  type: MapNodeType;
  position: WorldPoint;
  waitingPassengers: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  speedLimitMps: number;
  polyline: WorldPoint[];
}

export interface WorldMap {
  nodes: Record<string, MapNode>;
  roads: Record<string, RoadSegment>;
}
