import type { VehicleModelId } from "../../contracts/ids/EntityIds.js";
import type { SpeedMps } from "../../core/units/Units.js";

export interface VehicleModel {
  readonly id: VehicleModelId;
  readonly serviceClass: string;
  readonly maxSpeedMps: SpeedMps;
  readonly active: boolean;
}
