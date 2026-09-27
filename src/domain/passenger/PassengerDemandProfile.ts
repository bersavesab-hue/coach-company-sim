import type { StationId } from "../../contracts/ids/EntityIds.js";

export type PassengerDemandPattern =
  | "general"
  | "business"
  | "tourism"
  | "hub_transfer";

export interface PassengerDemandProfile {
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly basePassengersPerHour: number;
  readonly demandPattern?: PassengerDemandPattern;
  readonly strategicDemandPermille?: number;
}
