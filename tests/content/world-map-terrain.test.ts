import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FORMAL_WORLD_MAP_CONTENT } from "../../src/content/map/FormalWorldMapContent.js";

const terrainPath = fileURLToPath(
  new URL(
    "../../presentation/apk/assets/map/base-terrain.webp",
    import.meta.url
  )
);
const bounds = FORMAL_WORLD_MAP_CONTENT.regions[0]!.bounds;
const terrain = await sharp(terrainPath)
  .raw()
  .toBuffer({ resolveWithObject: true });

function colorAt(xM: number, yM: number): readonly number[] {
  const x = Math.max(
    0,
    Math.min(
      terrain.info.width - 1,
      Math.round(
        ((xM - bounds.minXM) / (bounds.maxXM - bounds.minXM)) *
          (terrain.info.width - 1)
      )
    )
  );
  const y = Math.max(
    0,
    Math.min(
      terrain.info.height - 1,
      Math.round(
        ((bounds.maxYM - yM) / (bounds.maxYM - bounds.minYM)) *
          (terrain.info.height - 1)
      )
    )
  );
  const offset =
    (y * terrain.info.width + x) * terrain.info.channels;
  return [
    terrain.data[offset]!,
    terrain.data[offset + 1]!,
    terrain.data[offset + 2]!
  ];
}

function isWater(color: readonly number[]): boolean {
  const [red, green, blue] = color as readonly [number, number, number];
  return blue > green + 10 && blue > red + 35 && blue > 125;
}

test("formal stations stay on terrain land after island removal", () => {
  const nodesById = new Map(
    FORMAL_WORLD_MAP_CONTENT.nodes.map((node) => [node.id, node])
  );
  for (const station of FORMAL_WORLD_MAP_CONTENT.stations) {
    const node = nodesById.get(station.worldNodeId)!;
    assert.equal(
      isWater(colorAt(node.position.xM, node.position.yM)),
      false,
      `${station.id} is positioned on water`
    );
  }

  const northwestCount = FORMAL_WORLD_MAP_CONTENT.stations.filter(
    (station) => {
      const position = nodesById.get(station.worldNodeId)!.position;
      return position.xM < 900_000 && position.yM > 590_000;
    }
  ).length;
  const southeastCount = FORMAL_WORLD_MAP_CONTENT.stations.filter(
    (station) => {
      const position = nodesById.get(station.worldNodeId)!.position;
      return position.xM > 900_000 && position.yM < 590_000;
    }
  ).length;
  assert.ok(northwestCount >= 15, "northwest station coverage regressed");
  assert.ok(southeastCount <= 11, "southeast station density regressed");
});

test("major roads do not run across large open water", () => {
  const majorClasses = new Set([
    "expressway",
    "national_road",
    "provincial_road"
  ]);
  for (const road of FORMAL_WORLD_MAP_CONTENT.roads) {
    if (!majorClasses.has(road.roadClass)) continue;
    let longestWaterRunM = 0;
    let waterRunM = 0;
    for (let index = 0; index < road.polyline.length - 1; index += 1) {
      const from = road.polyline[index]!;
      const to = road.polyline[index + 1]!;
      const distanceM = Math.hypot(
        to.xM - from.xM,
        to.yM - from.yM
      );
      const steps = Math.max(1, Math.ceil(distanceM / 2_500));
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps;
        const water = isWater(
          colorAt(
            from.xM + (to.xM - from.xM) * ratio,
            from.yM + (to.yM - from.yM) * ratio
          )
        );
        waterRunM = water ? waterRunM + distanceM / steps : 0;
        longestWaterRunM = Math.max(longestWaterRunM, waterRunM);
      }
    }
    assert.ok(
      longestWaterRunM <= 12_000,
      `${road.id} crosses ${Math.round(longestWaterRunM / 1000)}km of open water`
    );
  }
});
