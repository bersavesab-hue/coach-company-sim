import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("OwnedVehicle does not own route or map-position state", () => {
  const source = fs.readFileSync(
    new URL("../../src/domain/vehicle/OwnedVehicle.ts", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("routeId:"), false);
  assert.equal(source.includes("worldPosition:"), false);
  assert.equal(source.includes("routeSegmentIndex:"), false);
  assert.equal(source.includes("offsetOnSegmentM:"), false);
  assert.equal(source.includes("activeTripId:"), true);
});
