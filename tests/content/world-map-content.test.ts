import assert from "node:assert/strict";
import test from "node:test";
import { FORMAL_WORLD_MAP_CONTENT, validateFormalWorldMapContent } from "../../src/content/map/FormalWorldMapContent.js";
import { createPlayableWorldSeed } from "../../src/content/map/WorldMapSeed.js";

test("formal world map content is valid and supports all five road classes", () => {
  const validation = validateFormalWorldMapContent();
  assert.equal(validation.valid, true, validation.issues.join("\n"));
  assert.deepEqual(
    new Set(FORMAL_WORLD_MAP_CONTENT.roads.map(road => road.roadClass)),
    new Set(["local","county_road","provincial_road","national_road","expressway"])
  );
  assert.equal(FORMAL_WORLD_MAP_CONTENT.background.mode, "decorative_only");
});

test("formal world map builds the canonical runtime graph", () => {
  const seed = createPlayableWorldSeed();
  assert.equal(seed.world.allRoads().length, FORMAL_WORLD_MAP_CONTENT.roads.length);
  assert.equal(seed.stations.length, FORMAL_WORLD_MAP_CONTENT.stations.length);
  assert.ok(seed.passengerDemand.length > 0);
});
