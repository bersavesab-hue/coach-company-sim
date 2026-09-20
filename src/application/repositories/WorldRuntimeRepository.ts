import type { WorldRuntimeState } from "../../domain/world/WorldRuntimeState.js";

export interface WorldRuntimeRepository {
  get(): WorldRuntimeState;
  replace(state: WorldRuntimeState): void;
}
