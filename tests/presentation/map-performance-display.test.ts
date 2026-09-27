import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("portrait map camera derives its aspect from the visible map container", () => {
  assert.equal(template.includes("function mapViewportAspect"), true);
  assert.equal(template.includes("function mapCameraSize"), true);
  assert.equal(template.includes("function syncMapCameraAspect"), true);
  assert.equal(template.includes("function cameraForPoints"), true);
  assert.equal(template.includes("slice(0,6)"), true);
});

test("hidden pages do not rebuild the map once per realtime tick", () => {
  assert.equal(
    template.includes("if(mapActive)renderMap();"),
    true
  );
  assert.equal(
    template.includes("renderHome();renderMap();renderRoutes()"),
    false
  );
});

test("map pan changes only the viewBox and terrain tiles", () => {
  assert.equal(
    template.includes("mapCamera.y=Math.max(0,Math.min(m.ch-mapCamera.h,mapDrag.cy-dy));applyMapCamera()"),
    true
  );
  assert.equal(
    template.includes("terrainTileKey=\"\";const unlocked"),
    false
  );
});

test("optimized map inline script still parses", () => {
  const scripts = [
    ...template.matchAll(/<script>([\s\S]*?)<\/script>/g)
  ];
  assert.ok(scripts.length > 0);
  const inline = scripts[scripts.length - 1]![1]!
    .replace("__MAP_VIEW_CONFIG_JSON__", "{}");
  assert.doesNotThrow(() => new vm.Script(inline));
});
