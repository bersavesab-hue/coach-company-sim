import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import { transitionTrip } from "../../src/domain/trip/TripStateMachine.js";

function trip(): TripInstance {
  return {
    id: ids.trip("trip.000000000001"),
    routeId: ids.route("route.00000001"),
    servicePlanId: null,
    vehicleId: null,
    driverId: null,
    status: "planned",
    plannedDepartureGameSecond: units.gameSecond(1_000),
    actualDepartureGameSecond: null,
    actualArrivalGameSecond: null,
    position: {
      activeRoadSegmentIndex: 0,
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: units.gameSecond(0)
    },
    onboardPassengerCount: 0,
    delaySeconds: units.gameSecond(0)
  };
}

test("Trip follows the canonical lifecycle", () => {
  const boarding = transitionTrip(trip(), "boarding");
  assert.equal(boarding.ok, true);

  if (!boarding.ok) return;

  const running = transitionTrip(boarding.value, "running");
  assert.equal(running.ok, true);

  if (!running.ok) return;

  const completed = transitionTrip(running.value, "completed");
  assert.equal(completed.ok, true);
});

test("completed and cancelled trips cannot return to running", () => {
  const cancelled = transitionTrip(trip(), "cancelled");
  assert.equal(cancelled.ok, true);

  if (!cancelled.ok) return;

  const invalid = transitionTrip(cancelled.value, "running");
  assert.equal(invalid.ok, false);

  if (!invalid.ok) {
    assert.equal(invalid.error.code, "INVALID_STATE_TRANSITION");
  }
});
