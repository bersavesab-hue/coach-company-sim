import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("fleet cards use formal vehicle identity and localized status", () => {
  assert.equal(template.includes("function fleetVehicleName"), true);
  assert.equal(template.includes('available:"待命"'), true);
  assert.equal(template.includes('energyKindLabels={diesel_ml:"柴油"'), true);
  assert.equal(template.includes("esc(v.vehicleId)+'</div>"), false);
});

test("fleet detail exposes condition compliance tasks and map location", () => {
  assert.equal(template.includes('id="vehicleDetailBackdrop"'), true);
  assert.equal(template.includes("function conditionRow"), true);
  assert.equal(template.includes("insuranceValidUntilGameSecond"), true);
  assert.equal(template.includes("function locateFleetVehicle"), true);
  assert.equal(template.includes(">地图定位</button>"), true);
});

test("new vehicle purchase uses the formal configurator", () => {
  assert.equal(template.includes('id="configuratorBackdrop"'), true);
  assert.equal(template.includes("CoachGame.vehicleConfigurator"), true);
  assert.equal(template.includes("function updateConfiguratorTotal"), true);
  assert.equal(template.includes("CoachGame.buyConfiguredVehicle"), true);
  assert.equal(template.includes(">选装购买</button>"), true);
});

test("new and used vehicle purchases remain separate flows", () => {
  assert.equal(template.includes('x.listingKind==="new"'), true);
  assert.equal(template.includes(">购买二手车</button>"), true);
  assert.equal(template.includes(">车辆检测</button>"), true);
});
