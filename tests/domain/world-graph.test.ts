import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";

test("WorldGraph rejects roads that reference missing nodes", () => {
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");

  const result = WorldGraph.create(
    [
      {
        id: a,
        type: "city",
        name: "A",
        position: { xM: 0, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "test",
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
