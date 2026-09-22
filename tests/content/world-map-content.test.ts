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
  const counts = FORMAL_WORLD_MAP_CONTENT.roads.reduce<Record<string, number>>(
    (result, road) => {
      result[road.roadClass] = (result[road.roadClass] ?? 0) + 1;
      assert.ok(road.roadCode);
      assert.ok(road.displayPriority);
      return result;
    },
    {}
  );
  assert.deepEqual(counts, {
    expressway: 32,
    national_road: 40,
    provincial_road: 67,
    county_road: 10,
    local: 32
  });
  assert.equal(FORMAL_WORLD_MAP_CONTENT.roads.length, 181);
  assert.equal(FORMAL_WORLD_MAP_CONTENT.nodes.length, 118);
  assert.ok(
    FORMAL_WORLD_MAP_CONTENT.nodes.filter(
      (node) => node.id.includes(".ring.")
    ).length >= 32
  );
  assert.ok(
    FORMAL_WORLD_MAP_CONTENT.nodes.filter(
      (node) => node.id.includes(".auto.")
    ).length > 0
  );
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.roads.filter(
      (road) => road.displayPriority === 1
    ).every((road) => road.roadClass === "expressway"),
    true
  );
});

test("formal world map builds the canonical runtime graph", () => {
  const seed = createPlayableWorldSeed();
  assert.equal(seed.world.allRoads().length, FORMAL_WORLD_MAP_CONTENT.roads.length);
  assert.equal(seed.stations.length, FORMAL_WORLD_MAP_CONTENT.stations.length);
  assert.ok(seed.passengerDemand.length > 0);

  const start = seed.stations[0]!.worldNodeId;
  const visited = new Set([String(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of seed.world.outgoingFrom(current)) {
      const next = edge.toNodeId;
      if (!visited.has(String(next))) {
        visited.add(String(next));
        queue.push(next);
      }
    }
  }
  for (const station of seed.stations) {
    assert.equal(
      visited.has(String(station.worldNodeId)),
      true,
      `station ${station.id} is disconnected`
    );
  }
});
