import type { StationId } from "../../contracts/ids/EntityIds.js";

export interface PassengerDemandProfile {
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly basePassengersPerHour: number;
}
