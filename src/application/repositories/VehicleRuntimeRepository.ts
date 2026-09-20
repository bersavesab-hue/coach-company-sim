import type { VehicleLifecycleRuntimeState } from "../../domain/vehicle/VehicleLifecycleRuntimeState.js";

export interface VehicleRuntimeRepository {
  get(): VehicleLifecycleRuntimeState;
  replace(state: VehicleLifecycleRuntimeState): void;
}
