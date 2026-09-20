export type RouteType =
  | "rural"
  | "county"
  | "intercounty"
  | "intercity"
  | "interprovincial"
  | "tourism"
  | "airport_express";

export interface PassengerRoute {
  id: string;
  code: string;
  name: string;
  type: RouteType;
  stopNodeIds: string[];
  roadSegmentIds: string[];
  fareCents: number;
  departureIntervalSeconds: number;
  active: boolean;
}
