import type { VehicleModelId } from "../../contracts/ids/EntityIds.js";

export interface VehicleModel {
  readonly id: VehicleModelId;
  readonly serviceClass: string;
  readonly active: boolean;
}
