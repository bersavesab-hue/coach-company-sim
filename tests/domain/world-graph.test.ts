import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";

const region = {
  id: ids.region("region.000001"),
  name: "测试区域",
  level: "province_like" as const,
  parentRegionId: null,
  bounds: {
    minXM: 0,
    minYM: 0,
    maxXM: 100_000,
    maxYM: 100_000
  },
  active: true
};

test("WorldGraph rejects roads that reference missing nodes", () => {
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");

  const result = WorldGraph.create(
    [region],
    [
      {
        id: a,
        regionId: region.id,
        type: "city",
        name: "A",
        position: { xM: 0, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId: region.id,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [{ xM: 0, yM: 0 }, { xM: 1000, yM: 0 }],
        active: true
      }
    ]
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "REFERENCE_NOT_FOUND");
  }
});

test("WorldGraph builds direction-aware adjacency", () => {
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");

  const result = WorldGraph.create(
    [region],
    [
      {
        id: a,
        regionId: region.id,
        type: "city",
        name: "A",
        position: { xM: 0, yM: 0 },
        active: true
      },
      {
        id: b,
        regionId: region.id,
        type: "city",
        name: "B",
        position: { xM: 1000, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId: region.id,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [{ xM: 0, yM: 0 }, { xM: 1000, yM: 0 }],
        active: true
      }
    ]
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.outgoingFrom(a)[0]?.direction, "forward");
  assert.equal(result.value.outgoingFrom(b)[0]?.direction, "reverse");
});
