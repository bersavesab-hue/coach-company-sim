import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { pointOnRoad } from "../../domain/world/RoadGeometry.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";
import type { WorldPoint } from "../../domain/world/WorldPoint.js";

export function resolveTripWorldPosition(
  trip: TripInstance,
  route: PassengerRoute,
  graph: WorldGraph
): WorldPoint | null {
  const leg = route.pathLegs[trip.position.activeRoadSegmentIndex];
  if (!leg) return null;

  const road = graph.getRoad(leg.roadSegmentId);
  if (!road) return null;

  return pointOnRoad(
    graph,
    road,
    leg.direction,
    trip.position.offsetOnSegmentM
  );
}
