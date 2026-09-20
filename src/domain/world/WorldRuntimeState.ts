import type { RoadSegmentId } from "../../contracts/ids/EntityIds.js";
import { units } from "../../core/units/Units.js";
import type { RoadRuntimeState } from "./RoadRuntimeState.js";

const DEFAULT_ROAD_STATE: RoadRuntimeState = {
  status: "open",
  speedMultiplierPermille: units.permille(1000)
};

export class WorldRuntimeState {
  private readonly roadStates = new Map<RoadSegmentId, RoadRuntimeState>();

  getRoadState(roadId: RoadSegmentId): RoadRuntimeState {
    return this.roadStates.get(roadId) ?? DEFAULT_ROAD_STATE;
  }

  setRoadState(
    roadId: RoadSegmentId,
    state: RoadRuntimeState
  ): void {
    this.roadStates.set(roadId, state);
  }

  clearRoadState(roadId: RoadSegmentId): void {
    this.roadStates.delete(roadId);
  }
}
