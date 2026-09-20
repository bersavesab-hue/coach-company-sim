import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("PassengerRoute stores direction-aware path legs, not legacy road IDs", () => {
  const source = fs.readFileSync(
    new URL("../../src/domain/route/PassengerRoute.ts", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("vehicleId:"), false);
  assert.equal(source.includes("driverId:"), false);
  assert.equal(source.includes("passengerCount:"), false);
  assert.equal(source.includes("roadPathSegmentIds:"), false);
  assert.equal(source.includes("pathLegs:"), true);
});
