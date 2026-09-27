import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("route management previews fare changes before applying them", () => {
  assert.equal(
    template.includes("previewFareForecast"),
    true
  );
  assert.equal(
    template.includes("调价预测"),
    true
  );
  assert.equal(
    template.includes("预计客流变化"),
    true
  );
});

test("route management exposes seven-day operating history", () => {
  assert.equal(
    template.includes("routeHistorySummary"),
    true
  );
  assert.equal(
    template.includes("近7日"),
    true
  );
});
