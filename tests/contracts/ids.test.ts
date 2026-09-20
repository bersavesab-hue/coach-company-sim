import assert from "node:assert/strict";
import test from "node:test";

import {
  formatRuntimeId,
  ids
} from "../../src/contracts/ids/EntityIds.js";
import { ID_PREFIX } from "../../src/contracts/ids/IdPrefix.js";

test("runtime IDs are deterministic and monotonic-friendly", () => {
  assert.equal(formatRuntimeId(ID_PREFIX.vehicle, 1), "vehicle.00000001");
  assert.equal(formatRuntimeId(ID_PREFIX.trip, 42), "trip.000000000042");
});

test("branded ID constructors enforce prefixes", () => {
  assert.equal(ids.route("route.00000001"), "route.00000001");
  assert.throws(() => ids.route("vehicle.00000001"));
});
