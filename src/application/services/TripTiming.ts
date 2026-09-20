import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";

export interface EstimatedTripWindow {
  readonly startsAtGameSecond: GameSecond;
  readonly arrivesAtGameSecond: GameSecond;
  readonly drivingSeconds: number;
}

export function estimateRouteDrivingSeconds(
  route: PassengerRoute,
  model: VehicleModel,
  graph: WorldGraph,
  startLegIndex = 0,
  firstLegOffsetM = 0
): number {
  let seconds = 0;

  for (let index = startLegIndex; index < route.pathLegs.length; index += 1) {
    const leg = route.pathLegs[index]!;
    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) continue;

    const length =
      Math.max(
        0,
        Number(road.lengthM) -
          (index === startLegIndex ? firstLegOffsetM : 0)
      );
    const speed = Math.min(
      Number(model.maxSpeedMps),
      Number(road.speedLimitMps)
    );
    if (speed <= 0) continue;

    seconds += Math.ceil(length / speed);
  }

  return seconds;
}

export function estimateTripWindow(
  trip: TripInstance,
  route: PassengerRoute,
  model: VehicleModel,
  graph: WorldGraph
): EstimatedTripWindow {
  const start =
    trip.actualDepartureGameSecond ??
    trip.plannedDepartureGameSecond;

  const startLeg =
    trip.status === "running" || trip.status === "disrupted"
      ? trip.position.activeRoadSegmentIndex
      : 0;
  const offset =
    trip.status === "running" || trip.status === "disrupted"
      ? Number(trip.position.offsetOnSegmentM)
      : 0;

  const drivingSeconds = estimateRouteDrivingSeconds(
    route,
    model,
    graph,
    startLeg,
    offset
  );

  return {
    startsAtGameSecond: start,
    arrivesAtGameSecond: units.gameSecond(
      Number(start) + drivingSeconds
    ),
    drivingSeconds
  };
}
