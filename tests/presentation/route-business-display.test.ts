import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("route cards expose operating and economics feedback", () => {
  for (const label of [
    "今日乘客",
    "平均上座率",
    "相关候车",
    "流失",
    "票款",
    "变动成本",
    "贡献利润",
    "单班"
  ]) {
    assert.equal(template.includes(label), true);
  }
  assert.equal(template.includes("routeHealthLabels"), true);
});
