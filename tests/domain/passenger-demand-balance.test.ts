import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import {
  MAX_ROUTE_FARE_MULTIPLIER_PERMILLE,
  setRouteFareMultiplier
} from "../../src/domain/route/RouteRules.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import {
  fareDemandMultiplierForRatio,
  PLAYABLE_PASSENGER_DEMAND_POLICY
} from "../../src/content/passenger/PassengerDemandBalance.js";

const route: PassengerRoute = {
  id: ids.route("route.00000001"),
  companyId: ids.company("company.00000001"),
  code: "K01",
  type: "intercity",
  stopPoints: [],
  pathLegs: [],
  routingPreference: "fastest_time",
  farePolicyId: ids.farePolicy("fare_policy.standard"),
  requiredLicenseIds: [],
  status: "active"
};

test("route fare multiplier is bounded and independent per route", () => {
  const raised = setRouteFareMultiplier(route, 1200);
  assert.equal(raised.ok, true);
  if (raised.ok) {
    assert.equal(Number(raised.value.fareMultiplierPermille), 1200);
  }

  const invalid = setRouteFareMultiplier(
    route,
    MAX_ROUTE_FARE_MULTIPLIER_PERMILLE + 1
  );
  assert.equal(invalid.ok, false);
});

test("passenger demand reacts to service, price and time of day", () => {
  assert.equal(
    Number(
      PLAYABLE_PASSENGER_DEMAND_POLICY
        .frequencyMultiplierPermille(0)
    ),
    0
  );
  assert.equal(
    Number(
      PLAYABLE_PASSENGER_DEMAND_POLICY
        .frequencyMultiplierPermille(8)
    ) > 0,
    true
  );

  assert.equal(
    Number(fareDemandMultiplierForRatio(800)) >
      Number(fareDemandMultiplierForRatio(1000)),
    true
  );
  assert.equal(
    Number(fareDemandMultiplierForRatio(1200)) <
      Number(fareDemandMultiplierForRatio(1000)),
    true
  );

  const timePolicy =
    PLAYABLE_PASSENGER_DEMAND_POLICY.timeOfDayMultiplierPermille!;
  assert.equal(
    Number(timePolicy(8 * 3600)) >
      Number(timePolicy(2 * 3600)),
    true
  );

  const abandonment =
    PLAYABLE_PASSENGER_DEMAND_POLICY
      .queueAbandonmentPermillePerHour!;
  assert.equal(
    Number(abandonment(0)) >
      Number(abandonment(8)),
    true
  );
});
