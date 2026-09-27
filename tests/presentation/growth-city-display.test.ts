import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("city sheets expose growth stage and operating identity", () => {
  assert.equal(template.includes("客流指数"), true);
  assert.equal(template.includes("解锁阶段"), true);
  assert.equal(template.includes("operatingZoneLabel"), true);
  assert.equal(template.includes("cityRoleLabel"), true);
});

test("route planner exposes inferred route type and license gate", () => {
  assert.equal(template.includes("requiredLicenseName"), true);
  assert.equal(template.includes("许可已具备"), true);
  assert.equal(template.includes("缺少 "), true);
  assert.equal(template.includes("p.routeTypeLabel"), true);
});
