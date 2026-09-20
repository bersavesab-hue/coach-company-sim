import type { StationId } from "../../contracts/ids/EntityIds.js";

export interface OnboardPassengerGroup {
  readonly destinationStationId: StationId;
  readonly count: number;
}
