import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { generateDepartureSlots } from "../../src/domain/schedule/ScheduleExpander.js";
import type { ServicePlan } from "../../src/domain/schedule/ServicePlan.js";

test("fixed and interval schedules expand into deterministic departure slots", () => {
  const fixed: ServicePlan = {
    id: ids.servicePlan("service_plan.00000001"),
    routeId: ids.route("route.00000001"),
    effectiveFromGameSecond: units.gameSecond(0),
    effectiveUntilGameSecond: null,
    calendar: { serviceDays: ["monday"] },
    departurePattern: {
      kind: "fixed_times",
      secondOfDay: [6 * 3600, 8 * 3600]
    },
    requiredVehicleClass: "county_midibus",
    status: "active"
  };

  const fixedSlots = generateDepartureSlots(fixed, 1);
  assert.equal(fixedSlots.ok, true);
  if (!fixedSlots.ok) return;
  assert.deepEqual(
    fixedSlots.value.map((slot) => Number(slot.plannedDepartureGameSecond)),
    [21600, 28800]
  );

  const interval: ServicePlan = {
    ...fixed,
    id: ids.servicePlan("service_plan.00000002"),
    departurePattern: {
      kind: "interval_window",
      windows: [
        {
          startSecondOfDay: 6 * 3600,
          endSecondOfDay: 7 * 3600,
          intervalSeconds: 1800
        }
      ]
    }
  };

  const intervalSlots = generateDepartureSlots(interval, 1);
  assert.equal(intervalSlots.ok, true);
  if (!intervalSlots.ok) return;

  assert.deepEqual(
    intervalSlots.value.map((slot) => Number(slot.plannedDepartureGameSecond)),
    [21600, 23400, 25200]
  );
});
