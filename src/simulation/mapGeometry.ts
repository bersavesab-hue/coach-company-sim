import type { RoadSegment, WorldPoint } from "../domain/map.js";

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(b.xM - a.xM, b.yM - a.yM);
}

export function pointOnRoad(
  road: RoadSegment,
  offsetOnSegmentM: number
): WorldPoint {
  if (road.polyline.length === 0) {
    throw new Error(`Road ${road.id} has no polyline`);
  }

  if (road.polyline.length === 1 || road.lengthM <= 0) {
    return { ...road.polyline[0]! };
  }

  const offset = Math.max(0, Math.min(road.lengthM, offsetOnSegmentM));
  const ratio = offset / road.lengthM;

  const pieceLengths: number[] = [];
  let geometryLength = 0;

  for (let i = 0; i < road.polyline.length - 1; i += 1) {
    const pieceLength = distance(road.polyline[i]!, road.polyline[i + 1]!);
    pieceLengths.push(pieceLength);
    geometryLength += pieceLength;
  }

  if (geometryLength === 0) {
    return { ...road.polyline[0]! };
  }

  let target = geometryLength * ratio;

  for (let i = 0; i < pieceLengths.length; i += 1) {
    const pieceLength = pieceLengths[i]!;

    if (target <= pieceLength) {
      const from = road.polyline[i]!;
      const to = road.polyline[i + 1]!;
      const t = pieceLength === 0 ? 0 : target / pieceLength;

      return {
        xM: Math.round(from.xM + (to.xM - from.xM) * t),
        yM: Math.round(from.yM + (to.yM - from.yM) * t)
      };
    }

    target -= pieceLength;
  }

  return { ...road.polyline.at(-1)! };
}
