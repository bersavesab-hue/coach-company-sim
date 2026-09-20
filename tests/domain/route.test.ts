import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("PassengerRoute stores one canonical station mapping and direction-aware path", () => {
  const source = fs.readFileSync(
    new URL("../../src/domain/route/PassengerRoute.ts", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("orderedStationIds:"), false);
  assert.equal(source.includes("roadPathSegmentIds:"), false);
  assert.equal(source.includes("vehicleId:"), false);
  assert.equal(source.includes("pathLegs:"), true);
  assert.equal(source.includes("stopPoints:"), true);
});
