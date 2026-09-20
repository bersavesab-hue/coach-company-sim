import type {
  DistanceM,
  GameSecond
} from "../../core/units/Units.js";

export interface TripPosition {
  readonly activeRoadSegmentIndex: number;
  readonly offsetOnSegmentM: DistanceM;
  readonly lastUpdatedGameSecond: GameSecond;
}
