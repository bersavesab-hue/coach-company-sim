import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import {
  completeVehicleMaintenance,
  validateVehicleDispatchReadiness
} from "../../src/domain/vehicle/VehicleLifecycleRules.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel
} from "../helpers/TestVehicle.js";

function routeFixture() {
  const regionId = ids.region("region.000001");
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");
  const roadId = ids.roadSegment("road.000001");

  const graph = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: { minXM: 0, minYM: 0, maxXM: 10000, maxYM: 1000 },
        active: true
      }
    ],
    [
      { id: a, regionId, type: "junction", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: b, regionId, type: "junction", name: "B", position: { xM: 10000, yM: 0 }, active: true }
    ],
    [
      {
        id: roadId,
        regionId,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(10000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      }
    ]
  );
  if (!graph.ok) throw graph.error;

  const route: PassengerRoute = {
    id: ids.route("route.00000001"),
    companyId: ids.company("company.00000001"),
    code: "K01",
    type: "county",
    stopPoints: [
      { stationId: ids.station("station.000001"), pathLegBoundaryIndex: 0 },
      { stationId: ids.station("station.000002"), pathLegBoundaryIndex: 1 }
    ],
    pathLegs: [
      {
        roadSegmentId: roadId,
        direction: "forward",
        fromNodeId: a,
        toNodeId: b
      }
    ],
    routingPreference: "shortest_distance",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  return { graph: graph.value, route };
}

test("dispatch rejects insufficient energy and expired documents", () => {
  const { graph, route } = routeFixture();
  const model = createTestVehicleModel({
    drivingEnergyUnitsPer100Km: 20_000,
    minimumDispatchEnergyUnits: 5_000
  });

  const lowEnergy = createTestOwnedVehicle({
    status: "assigned",
    activeTripId: ids.trip("trip.000000000001"),
    energyUnits: 6_000
  });

  const energyResult = validateVehicleDispatchReadiness(
    lowEnergy,
    model,
    route,
    graph,
    units.gameSecond(100)
  );
  assert.equal(energyResult.ok, false);
  if (!energyResult.ok) {
    assert.equal(
      energyResult.error.code,
      "VEHICLE_ENERGY_INSUFFICIENT"
    );
  }

  const expired = {
    ...createTestOwnedVehicle({
      status: "assigned",
      activeTripId: ids.trip("trip.000000000001"),
      energyUnits: 100_000
    }),
    insuranceValidUntilGameSecond: units.gameSecond(99)
  };

  const insuranceResult = validateVehicleDispatchReadiness(
    expired,
    model,
    route,
    graph,
    units.gameSecond(100)
  );
  assert.equal(insuranceResult.ok, false);
  if (!insuranceResult.ok) {
    assert.equal(
      insuranceResult.error.code,
      "VEHICLE_INSURANCE_EXPIRED"
    );
  }
});

test("maintenance restores technical condition and resets interval", () => {
  const model = createTestVehicleModel({
    serviceIntervalM: 10_000
  });
  const vehicle = {
    ...createTestOwnedVehicle({
      status: "maintenance",
      mileageM: 50_000,
      nextMaintenanceMileageM: 50_000
    }),
    powertrainConditionPermille: units.permille(500),
    brakeConditionPermille: units.permille(600),
    tireConditionPermille: units.permille(700),
    bodyConditionPermille: units.permille(800)
  };

  const maintained = completeVehicleMaintenance(vehicle, model);

  assert.equal(Number(maintained.powertrainConditionPermille), 1000);
  assert.equal(Number(maintained.brakeConditionPermille), 1000);
  assert.equal(Number(maintained.tireConditionPermille), 1000);
  assert.equal(Number(maintained.bodyConditionPermille), 1000);
  assert.equal(Number(maintained.lastMaintenanceMileageM), 50_000);
  assert.equal(Number(maintained.nextMaintenanceMileageM), 60_000);
  assert.equal(maintained.status, "available");
});
