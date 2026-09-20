import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";

test("road runtime state defaults to fully open", () => {
  const runtime = new WorldRuntimeState();
  const roadId = ids.roadSegment("road.000001");

  const state = runtime.getRoadState(roadId);

  assert.equal(state.status, "open");
  assert.equal(Number(state.speedMultiplierPermille), 1000);
});

test("road runtime state can be overridden and cleared", () => {
  const runtime = new WorldRuntimeState();
  const roadId = ids.roadSegment("road.000001");

  runtime.setRoadState(roadId, {
    status: "open",
    speedMultiplierPermille: units.permille(600)
  });

  assert.equal(
    Number(runtime.getRoadState(roadId).speedMultiplierPermille),
    600
  );

  runtime.clearRoadState(roadId);

  assert.equal(
    Number(runtime.getRoadState(roadId).speedMultiplierPermille),
    1000
  );
});
