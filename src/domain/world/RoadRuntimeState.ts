import type { Permille } from "../../core/units/Units.js";

export type RoadRuntimeStatus = "open" | "closed";

export interface RoadRuntimeState {
  readonly status: RoadRuntimeStatus;
  readonly speedMultiplierPermille: Permille;
}
