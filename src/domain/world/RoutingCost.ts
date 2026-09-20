import type { RoadSegment } from "./RoadSegment.js";
import type { RoadRuntimeState } from "./RoadRuntimeState.js";

export type RoutingPreference = "shortest_distance" | "fastest_time";

export function routingCost(
  road: RoadSegment,
  runtime: RoadRuntimeState,
  preference: RoutingPreference
): number | null {
  if (!road.active || runtime.status === "closed") {
    return null;
  }

  if (preference === "shortest_distance") {
    return Number(road.lengthM);
  }

  const multiplier = Number(runtime.speedMultiplierPermille);
  if (multiplier <= 0) {
    return null;
  }

  const numerator = Number(road.lengthM) * 1000;
  const denominator = Number(road.speedLimitMps) * multiplier;

  return Math.ceil(numerator / denominator);
}
