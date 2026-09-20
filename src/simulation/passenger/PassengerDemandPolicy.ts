import type { Permille } from "../../core/units/Units.js";

export interface PassengerDemandPolicy {
  frequencyMultiplierPermille(departuresPerDay: number): Permille;
}
