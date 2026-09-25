import type { MultiplierPermille } from "../../core/units/Units.js";

export interface PassengerDemandPolicy {
  frequencyMultiplierPermille(
    departuresPerDay: number
  ): MultiplierPermille;
}
