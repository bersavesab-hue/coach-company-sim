import type { DistanceM } from "../../core/units/Units.js";
import type { TraversalDirection } from "./RoadTraversal.js";
import type { RoadSegment } from "./RoadSegment.js";
import type { WorldGraph } from "./WorldGraph.js";
import type { WorldPoint } from "./WorldPoint.js";

export function pointOnRoad(
  graph: WorldGraph,
  road: RoadSegment,
  direction: TraversalDirection,
  offsetOnSegmentM: DistanceM
): WorldPoint | null {
  const from = graph.getNode(road.fromNodeId);
  const to = graph.getNode(road.toNodeId);
  if (!from || !to) return null;

  const base = normalizePolyline(
    from.position,
    road.polyline,
    to.position
  );
  const oriented =
    direction === "forward" ? base : [...base].reverse();

  if (oriented.length === 1) return oriented[0] ?? null;

  const officialLength = Math.max(1, Number(road.lengthM));
  const fraction = Math.max(
    0,
    Math.min(1, Number(offsetOnSegmentM) / officialLength)
  );

  const visualLengths: number[] = [];
  let visualTotal = 0;

  for (let index = 0; index < oriented.length - 1; index += 1) {
    const a = oriented[index]!;
    const b = oriented[index + 1]!;
    const length = Math.hypot(b.xM - a.xM, b.yM - a.yM);
    visualLengths.push(length);
    visualTotal += length;
  }

  if (visualTotal === 0) {
    return oriented[0] ?? null;
  }

  let target = visualTotal * fraction;

  for (let index = 0; index < visualLengths.length; index += 1) {
    const segmentLength = visualLengths[index]!;
    const a = oriented[index]!;
    const b = oriented[index + 1]!;

    if (target <= segmentLength || index === visualLengths.length - 1) {
      const local =
        segmentLength === 0 ? 0 : Math.min(1, target / segmentLength);

      return {
        xM: a.xM + (b.xM - a.xM) * local,
        yM: a.yM + (b.yM - a.yM) * local
      };
    }

    target -= segmentLength;
  }

  return oriented.at(-1) ?? null;
}

function normalizePolyline(
  from: WorldPoint,
  polyline: readonly WorldPoint[],
  to: WorldPoint
): readonly WorldPoint[] {
  const points = [...polyline];

  if (points.length === 0 || !samePoint(points[0]!, from)) {
    points.unshift(from);
  }

  if (!samePoint(points.at(-1)!, to)) {
    points.push(to);
  }

  return points;
}

function samePoint(a: WorldPoint, b: WorldPoint): boolean {
  return a.xM === b.xM && a.yM === b.yM;
}
