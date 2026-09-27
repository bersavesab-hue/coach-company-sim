import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("map aggregates route density instead of painting every route", () => {
  assert.equal(template.includes("function screenRoutePoints"), true);
  assert.equal(template.includes("function aggregateRouteNetwork"), true);
  assert.equal(template.includes("function smoothScreenPath"), true);
  assert.equal(template.includes('class="routeNetworkLine load'), true);
  assert.equal(template.includes("Math.min(4,segment.count)"), true);
  assert.equal(
    template.includes("activeRoutes.forEach((route,index)"),
    false
  );
});

test("map labels hide collisions and follow zoom detail", () => {
  assert.equal(template.includes("function stationLabelVisible"), true);
  assert.equal(template.includes("labelVisible:!!chosen"), true);
  assert.equal(template.includes("function currentMapDetail"), true);
  assert.equal(template.includes("function mapStaticSignatureFor"), true);
  assert.equal(template.includes("mapStaticSignature=signature"), true);
});

test("map exposes route focus and layer controls", () => {
  assert.equal(template.includes('id="mapRouteLayerBtn"'), true);
  assert.equal(template.includes('id="mapLabelLayerBtn"'), true);
  assert.equal(template.includes("function showRouteOnMap"), true);
  assert.equal(template.includes("function cycleMapRouteLayer"), true);
  assert.equal(template.includes(">地图查看</button>"), true);
});

test("map separates static geography from dynamic vehicles", () => {
  assert.equal(template.includes('id="mapStaticLayer"'), true);
  assert.equal(template.includes('id="mapDynamicLayer"'), true);
  assert.equal(template.includes('q("mapDynamicLayer").innerHTML=dynamic'), true);
  assert.equal(template.includes('q("mapStaticLayer").innerHTML='), true);
  assert.equal(template.includes('q("mapSvg").innerHTML=h'), false);
});

test("road shields share collision reservations with city and route labels", () => {
  assert.equal(template.includes("shieldSvg(r,sx,sy,occupied,detail)"), true);
  assert.equal(template.includes("function roadShieldVisible"), true);
  assert.equal(template.includes("function stationPointVisible"), true);
  assert.equal(template.includes("return\"\""), true);
});
