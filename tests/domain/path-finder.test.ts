import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { findPath } from "../../src/domain/world/PathFinder.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";

function buildWorld() {
  const regionId = ids.region("region.000001");
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");
  const c = ids.worldNode("location.000003");

  const result = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区域",
        level: "province_like",
        parentRegionId: null,
        bounds: {
          minXM: 0,
          minYM: 0,
          maxXM: 100_000,
          maxYM: 100_000
        },
        active: true
      }
    ],
    [
      {
        id: a,
        regionId,
        type: "city",
        name: "A",
        position: { xM: 0, yM: 0 },
        active: true
      },
      {
        id: b,
        regionId,
        type: "city",
        name: "B",
        position: { xM: 1000, yM: 0 },
        active: true
      },
      {
        id: c,
        regionId,
        type: "city",
        name: "C",
        position: { xM: 2000, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(10),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      },
      {
        id: ids.roadSegment("road.000002"),
        regionId,
        fromNodeId: b,
        toNodeId: c,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(10),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      },
      {
        id: ids.roadSegment("road.000003"),
        regionId,
        fromNodeId: a,
        toNodeId: c,
        lengthM: units.distanceM(2600),
        speedLimitMps: units.speedMps(30),
        roadClass: "expressway",
        direction: "forward",
        polyline: [],
        active: true
      }
    ]
  );

  if (!result.ok) {
    throw result.error;
  }

  return { graph: result.value, runtime: new WorldRuntimeState(), a, b, c };
}

test("path finding can optimize distance or time independently", () => {
  const { graph, runtime, a, c } = buildWorld();

  const shortest = findPath(
    graph,
    runtime,
    a,
    c,
    "shortest_distance"
  );
  const fastest = findPath(
    graph,
    runtime,
    a,
    c,
    "fastest_time"
  );

  assert.equal(shortest.ok, true);
  assert.equal(fastest.ok, true);
  if (!shortest.ok || !fastest.ok) return;

  assert.deepEqual(
    shortest.value.legs.map((leg) => String(leg.roadSegmentId)),
    ["road.000001", "road.000002"]
  );

  assert.deepEqual(
    fastest.value.legs.map((leg) => String(leg.roadSegmentId)),
    ["road.000003"]
  );
});

test("road runtime closure changes the available path", () => {
  const { graph, runtime, a, c } = buildWorld();

  runtime.setRoadState(ids.roadSegment("road.000003"), {
    status: "closed",
    speedMultiplierPermille: units.permille(1000)
  });

  const result = findPath(
    graph,
    runtime,
    a,
    c,
    "fastest_time"
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(
    result.value.legs.map((leg) => String(leg.roadSegmentId)),
    ["road.000001", "road.000002"]
  );
});

test("path legs preserve reverse traversal direction", () => {
  const { graph, runtime, a, b } = buildWorld();

  const result = findPath(
    graph,
    runtime,
    b,
    a,
    "shortest_distance"
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.legs[0]?.direction, "reverse");
});
