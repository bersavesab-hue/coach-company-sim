import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("route management uses map-only creation and exposes fare controls", () => {
  assert.equal(
    template.includes('id="routeCode"'),
    false
  );
  assert.equal(
    template.includes("adjustRouteFare"),
    true
  );
  assert.equal(
    template.includes('call("setRouteFare"'),
    true
  );
  assert.equal(
    template.includes("票价需求系数"),
    true
  );
  assert.equal(
    template.includes("已开放城市"),
    true
  );
});
