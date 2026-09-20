import type { PassengerRuntimeState } from "../../domain/passenger/PassengerRuntimeState.js";

export interface PassengerRuntimeRepository {
  get(): PassengerRuntimeState;
  replace(state: PassengerRuntimeState): void;
}
