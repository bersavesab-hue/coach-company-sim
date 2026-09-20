import type { StationId } from "../../../contracts/ids/EntityIds.js";

export interface StationQueueQuery {
  readonly type: "passenger.stationQueue";
  readonly payload: {
    readonly stationId: StationId;
  };
}
