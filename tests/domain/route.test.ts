import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("PassengerRoute contains long-term route facts, not runtime vehicle state", () => {
  const source = fs.readFileSync(
    new URL("../../src/domain/route/PassengerRoute.ts", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("vehicleId:"), false);
  assert.equal(source.includes("driverId:"), false);
  assert.equal(source.includes("passengerCount:"), false);
  assert.equal(source.includes("roadPathSegmentIds:"), true);
});
