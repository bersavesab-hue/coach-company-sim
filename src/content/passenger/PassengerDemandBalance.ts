import { units } from "../../core/units/Units.js";
import type { PassengerDemandPolicy } from "../../simulation/passenger/PassengerDemandPolicy.js";

export function fareDemandMultiplierForRatio(
  fareRatioPermille: number
) {
  const ratio = Math.max(600, Math.min(1600, fareRatioPermille));
  let value: number;

  if (ratio <= 800) {
    value = 1250 + Math.floor((800 - ratio) * 0.25);
  } else if (ratio <= 1000) {
    value = 1000 + Math.floor((1000 - ratio) * 1.25);
  } else if (ratio <= 1200) {
    value = 1000 - Math.floor((ratio - 1000) * 1.5);
  } else {
    value = 700 - Math.floor((ratio - 1200) * 1.3);
  }

  return units.multiplierPermille(
    Math.max(180, Math.min(1350, value))
  );
}

export const PLAYABLE_PASSENGER_DEMAND_POLICY: PassengerDemandPolicy = {
  frequencyMultiplierPermille: (departuresPerDay) => {
    if (departuresPerDay <= 0) {
      return units.multiplierPermille(0);
    }

    const value =
      420 + Math.floor(Math.sqrt(departuresPerDay) * 185);
    return units.multiplierPermille(
      Math.min(1250, value)
    );
  },

  fareMultiplierPermille: (fareRatioPermille) =>
    fareDemandMultiplierForRatio(fareRatioPermille),

  timeOfDayMultiplierPermille: (secondOfDay) => {
    const hour =
      Math.floor(
        Math.max(0, secondOfDay) / 3600
      ) % 24;

    const value =
      hour < 5
        ? 80
        : hour < 7
          ? 620
          : hour < 9
            ? 1450
            : hour < 16
              ? 900
              : hour < 19
                ? 1500
                : hour < 22
                  ? 820
                  : 260;

    return units.multiplierPermille(value);
  },

  queueAbandonmentPermillePerHour: (departuresPerDay) =>
    units.permille(
      departuresPerDay <= 0
        ? 450
        : departuresPerDay <= 2
          ? 120
          : 55
    )
};
