import type { VehicleId } from "../../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../../core/units/Units.js";

export interface VehicleLifecycleQuery {
  readonly type: "vehicle.lifecycle";
  readonly payload: {
    readonly vehicleId: VehicleId;
    readonly atGameSecond: GameSecond;
  };
}
