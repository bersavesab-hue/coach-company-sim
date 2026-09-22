import assert from "node:assert/strict";
import test from "node:test";
import { FORMAL_WORLD_MAP_CONTENT, validateFormalWorldMapContent } from "../../src/content/map/FormalWorldMapContent.js";
import { createPlayableWorldSeed } from "../../src/content/map/WorldMapSeed.js";
import { isMapStationUnlocked } from "../../src/content/map/MapStationUnlockPolicy.js";

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
    expressway: 34,
    national_road: 40,
    provincial_road: 77,
    county_road: 10,
    local: 39
  });
  assert.equal(FORMAL_WORLD_MAP_CONTENT.roads.length, 200);
  assert.equal(FORMAL_WORLD_MAP_CONTENT.nodes.length, 136);
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.stations.every(
      (station) =>
        Number.isSafeInteger(station.unlockReputationPermille) &&
        station.unlockReputationPermille >= 0 &&
        station.unlockReputationPermille <= 1000
    ),
    true
  );
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.stations.filter(
      (station) => isMapStationUnlocked(station, 180)
    ).length,
    12
  );
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.stations
      .slice(0, 3)
      .every(
        (station) => station.unlockReputationPermille === 0
      ),
    true
  );
  assert.ok(
    FORMAL_WORLD_MAP_CONTENT.nodes.filter(
      (node) =>
        node.id.includes(".ring.") ||
        node.id.includes(".ring2.")
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
  const expresswayCorridors = FORMAL_WORLD_MAP_CONTENT.roads
    .filter((road) => road.roadClass === "expressway")
    .reduce<Record<string, number>>((result, road) => {
      result[road.roadCode!] =
        (result[road.roadCode!] ?? 0) + 1;
      assert.ok(
        road.polyline.length >= 4,
        `${road.id} expressway must use natural multi-point geometry`
      );
      return result;
    }, {});
  assert.deepEqual(expresswayCorridors, {
    H01: 7,
    H02: 8,
    H03: 7,
    H11: 4,
    H13: 4,
    H21: 4
  });
  for (const removedCode of ["H12", "H14", "H22"]) {
    assert.equal(
      FORMAL_WORLD_MAP_CONTENT.roads.some(
        (road) =>
          road.roadClass === "expressway" &&
          road.roadCode === removedCode
      ),
      false
    );
  }

  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.roads.filter(
      (road) => road.roadRole === "ramp"
    ).length,
    6
  );
  assert.ok(
    FORMAL_WORLD_MAP_CONTENT.roads.filter(
      (road) => road.roadRole === "urban_ring"
    ).length >= 32
  );
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.nodes.some(
      (node) => node.id === "location.junction.j"
    ),
    false
  );
  const startRingCounts = new Map<string, number>();
  for (const road of FORMAL_WORLD_MAP_CONTENT.roads) {
    if (["P820", "P821", "P822"].includes(road.roadCode ?? "")) {
      startRingCounts.set(
        road.roadCode!,
        (startRingCounts.get(road.roadCode!) ?? 0) + 1
      );
    }
  }
  assert.deepEqual(
    Object.fromEntries(startRingCounts),
    { P820: 6, P821: 7, P822: 6 }
  );
  for (const oldPrefix of [
    "location.junction.ring.heyuan.",
    "location.junction.ring.yongan.",
    "location.junction.ring.yunzhou."
  ]) {
    assert.equal(
      FORMAL_WORLD_MAP_CONTENT.nodes.some(
        (node) => node.id.startsWith(oldPrefix)
      ),
      false
    );
  }
  const naturalCorridorIds = [
    "road.r008",
    "road.r009",
    "road.r010",
    "road.r014",
    "road.r015",
    "road.r021",
    "road.r022",
    "road.r027",
    "road.r028",
    "road.r029",
    "road.r041",
    "road.r042",
    "road.r043",
    "road.r064",
    "road.r065",
    "road.r069",
    "road.r070"
  ];
  for (const roadId of naturalCorridorIds) {
    const road = FORMAL_WORLD_MAP_CONTENT.roads.find(
      (value) => value.id === roadId
    );
    assert.ok(road, `missing natural corridor ${roadId}`);
    assert.ok(
      road.polyline.length >= 4,
      `${roadId} must use a multi-point natural corridor`
    );
  }
  for (const id of [
    "location.junction.j.h02.w",
    "location.junction.j.h02.e",
    "location.junction.j.h21.n",
    "location.junction.j.h21.s"
  ]) {
    assert.equal(
      FORMAL_WORLD_MAP_CONTENT.nodes.some(
        (node) => node.id === id
      ),
      true
    );
  }
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
