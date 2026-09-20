import type { VehicleBrandId } from "../../contracts/ids/EntityIds.js";

export interface VehicleBrand {
  readonly id: VehicleBrandId;
  readonly name: string;
  readonly originCode: string | null;
  readonly active: boolean;
}
