import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { PathLeg } from "../../domain/world/RoadPath.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";

export interface FleetPathTiming {
  readonly seconds: number;
  readonly distanceM: number;
  readonly roadUsage: readonly {
    readonly roadSegmentId: PathLeg["roadSegmentId"];
    readonly distanceM: number;
  }[];
}

export function estimatePathSeconds(
  legs: readonly PathLeg[],
  model: VehicleModel,
  graph: WorldGraph
): FleetPathTiming {
  let seconds = 0;
  let distanceM = 0;
  const roadUsage = [];

  for (const leg of legs) {
    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) continue;

    const distance = Number(road.lengthM);
    const speed = Math.min(
      Number(model.maxSpeedMps),
      Number(road.speedLimitMps)
    );
    distanceM += distance;
    if (speed > 0) seconds += Math.ceil(distance / speed);
    roadUsage.push({
      roadSegmentId: road.id,
      distanceM: distance
    });
  }

  return { seconds, distanceM, roadUsage };
}
