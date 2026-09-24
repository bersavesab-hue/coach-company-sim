import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("service plans use the in-app scheduling panel instead of prompts", () => {
  assert.equal(template.includes('id="planBackdrop"'), true);
  assert.equal(template.includes("function updatePlanEstimate"), true);
  assert.equal(template.includes("function submitPlan"), true);
  assert.equal(template.includes('prompt("车辆级别'), false);
  assert.equal(template.includes('prompt("首班小时'), false);
});

test("route cards expose schedule details and lifecycle actions", () => {
  assert.equal(template.includes("function planPatternSummary"), true);
  assert.equal(template.includes("function planCard"), true);
  assert.equal(template.includes("function cancelPlan"), true);
  assert.equal(template.includes('call("cancelServicePlan"'), true);
});

test("schedule panel reports owned vehicle supply before creation", () => {
  assert.equal(template.includes("function ownedVehicleClassCounts"), true);
  assert.equal(template.includes("提交排班时会显示车辆缺口"), true);
  assert.equal(template.includes("Math.floor((end-start)*60/interval)+1"), true);
});
