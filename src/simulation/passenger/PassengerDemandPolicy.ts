import type {
  MultiplierPermille,
  Permille
} from "../../core/units/Units.js";

export interface PassengerDemandPolicy {
  frequencyMultiplierPermille(
    departuresPerDay: number
  ): MultiplierPermille;

  fareMultiplierPermille?(
    fareRatioPermille: number
  ): MultiplierPermille;

  timeOfDayMultiplierPermille?(
    secondOfDay: number
  ): MultiplierPermille;

  queueAbandonmentPermillePerHour?(
    departuresPerDay: number
  ): Permille;
}
