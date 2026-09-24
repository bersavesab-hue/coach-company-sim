import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("dispatch center groups trips into route timelines", () => {
  assert.equal(template.includes('id="dispatchFilters"'), true);
  assert.equal(template.includes("function routeDutyCard"), true);
  assert.equal(template.includes("function tripCard"), true);
  assert.equal(template.includes('class="dutyTimeline"'), true);
});

test("dispatch center localizes statuses and exposes problem filters", () => {
  assert.equal(template.includes('planned:"待发"'), true);
  assert.equal(template.includes('data-filter="problem"'), true);
  assert.equal(template.includes("function isTripProblem"), true);
  assert.equal(template.includes("function setDispatchFilter"), true);
});

test("dispatch trips can focus their canonical route and live vehicle", () => {
  assert.equal(template.includes("function showTripOnMap"), true);
  assert.equal(template.includes("mapTrackedTripId=tripId"), true);
  assert.equal(template.includes('class="trackedVehicle"'), true);
  assert.equal(template.includes(">地图追踪</button>"), true);
});

test("dispatch center renders formal occupancy and resource shortages", () => {
  assert.equal(template.includes("trip.onboardPassengerCount"), true);
  assert.equal(template.includes("trip.vehicleSeatCapacity"), true);
  assert.equal(template.includes('id="shortageList"'), true);
  assert.equal(template.includes('id="supportList"'), true);
});
