import assert from "node:assert/strict";
import test from "node:test";

import {
  validateStage15VehicleContent
} from "../../src/content/vehicle/VehicleStage15Validator.js";

test("stage 15 formal vehicle content passes one full validation gate", () => {
  const result = validateStage15VehicleContent();

  assert.equal(result.valid, true);
  assert.deepEqual(result.counts, {
    brands: 10,
    series: 32,
    models: 100,
    variants: 180,
    options: 48,
    dealers: 24,
    marketZones: 6
  });
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.severity === "error"
    ),
    []
  );
});
