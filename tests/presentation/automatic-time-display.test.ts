import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("game time advances automatically with pause and speed controls", () => {
  assert.equal(template.includes("function autoClockTick"), true);
  assert.equal(template.includes("CoachGame.advanceRealtime"), true);
  assert.equal(template.includes('data-speed="0"'), true);
  assert.equal(template.includes('data-speed="60"'), true);
  assert.equal(template.includes('data-speed="180"'), true);
  assert.equal(template.includes('data-speed="600"'), true);
  assert.equal(template.includes("advanceMinutes"), false);
  assert.equal(template.includes("+15分"), false);
});

test("routes and dispatch cards expose canonical distance and duration", () => {
  assert.equal(template.includes("r.distanceM"), true);
  assert.equal(template.includes("r.estimatedSeconds"), true);
  assert.equal(template.includes("trip.distanceM"), true);
  assert.equal(template.includes("trip.scheduledDurationSeconds"), true);
});
