import type { StationId } from "../ids/EntityIds.js";

export interface StationQueueDto {
  readonly stationId: StationId;
  readonly groups: readonly {
    readonly destinationStationId: StationId;
    readonly count: number;
  }[];
  readonly totalWaiting: number;
}
