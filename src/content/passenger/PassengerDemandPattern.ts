import type {
  PassengerDemandPattern,
  PassengerDemandProfile
} from "../../domain/passenger/PassengerDemandProfile.js";

export function passengerDemandPatternForRoles(
  originRole: string,
  destinationRole: string,
  sameOperatingZone: boolean
): PassengerDemandPattern {
  if (
    originRole === "tourism" ||
    destinationRole === "tourism"
  ) {
    return "tourism";
  }
  if (
    originRole === "business" ||
    destinationRole === "business"
  ) {
    return "business";
  }
  if (
    ["hub", "gateway"].includes(originRole) &&
    ["hub", "gateway"].includes(destinationRole)
  ) {
    return "hub_transfer";
  }
  if (
    !sameOperatingZone &&
    (
      ["hub", "gateway"].includes(originRole) ||
      ["hub", "gateway"].includes(destinationRole)
    )
  ) {
    return "hub_transfer";
  }
  return "general";
}

export function strategicOdDemandPermille(
  originRole: string,
  destinationRole: string,
  sameOperatingZone: boolean,
  originTransferValuePermille: number,
  destinationTransferValuePermille: number
): number {
  let value = sameOperatingZone ? 1080 : 960;

  if (
    originRole === "gateway" ||
    destinationRole === "gateway"
  ) {
    value += 140;
  }
  if (
    originRole === "hub" ||
    destinationRole === "hub"
  ) {
    value += 80;
  }
  if (
    (originRole === "tourism" &&
      ["hub", "gateway", "business"].includes(destinationRole)) ||
    (destinationRole === "tourism" &&
      ["hub", "gateway", "business"].includes(originRole))
  ) {
    value += 140;
  }
  if (
    originRole === "business" &&
    destinationRole === "business"
  ) {
    value += 100;
  }

  const transferAverage = Math.floor(
    (
      originTransferValuePermille +
      destinationTransferValuePermille
    ) / 2
  );
  value += Math.floor((transferAverage - 1000) * 0.35);

  return Math.max(750, Math.min(1400, value));
}

export function demandPatternMultiplierPermille(
  profile: PassengerDemandProfile,
  gameDay: number
): number {
  const pattern = profile.demandPattern ?? "general";
  const dayOfWeek = ((Math.max(1, gameDay) - 1) % 7) + 1;
  const weekend = dayOfWeek >= 6;

  let calendar = 1000;
  switch (pattern) {
    case "business":
      calendar = weekend ? 780 : 1150;
      break;
    case "tourism":
      calendar =
        dayOfWeek === 5
          ? 1120
          : weekend
            ? 1450
            : 850;
      break;
    case "hub_transfer":
      calendar = weekend ? 1150 : 1080;
      break;
    case "general":
      calendar = weekend ? 1080 : 1000;
      break;
  }

  if (pattern === "tourism") {
    const cycleDay = ((Math.max(1, gameDay) - 1) % 28) + 1;
    const seasonal =
      cycleDay <= 7
        ? 880
        : cycleDay <= 14
          ? 1000
          : cycleDay <= 21
            ? 1250
            : 1050;
    calendar = Math.floor(calendar * seasonal / 1000);
  }

  return Math.max(600, Math.min(1700, calendar));
}

export function effectiveProfileDemandPermille(
  profile: PassengerDemandProfile,
  gameDay: number
): number {
  const strategic =
    profile.strategicDemandPermille ?? 1000;
  return Math.max(
    500,
    Math.min(
      1800,
      Math.floor(
        strategic *
          demandPatternMultiplierPermille(
            profile,
            gameDay
          ) /
          1000
      )
    )
  );
}

export function passengerDemandPatternLabel(
  pattern: PassengerDemandPattern
): string {
  switch (pattern) {
    case "general": return "日常出行";
    case "business": return "工作日商务";
    case "tourism": return "周末/旺季旅游";
    case "hub_transfer": return "枢纽换乘";
  }
}
