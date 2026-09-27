import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("city detail exposes station economics capacity and popular OD", () => {
  for (const label of [
    "单班站场能力",
    "换乘价值",
    "发车费",
    "到站费",
    "旅客服务",
    "热门去向"
  ]) {
    assert.equal(template.includes(label), true);
  }
});
