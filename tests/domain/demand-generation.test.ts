import assert from "node:assert/strict";
import test from "node:test";

import { units } from "../../src/core/units/Units.js";
import { generatePassengerDemand } from "../../src/simulation/passenger/DemandGeneration.js";

test("demand generation preserves integer remainder across batches", () => {
  const first = generatePassengerDemand(
    10,
    units.permille(500),
    1800,
    0
  );
  const second = generatePassengerDemand(
    10,
    units.permille(500),
    1800,
    first.remainderUnits
  );
  const single = generatePassengerDemand(
    10,
    units.permille(500),
    3600,
    0
  );

  assert.equal(
    first.generatedPassengers + second.generatedPassengers,
    single.generatedPassengers
  );
  assert.equal(second.remainderUnits, single.remainderUnits);
  assert.equal(single.generatedPassengers, 5);
});
