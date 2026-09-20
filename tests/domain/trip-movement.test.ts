import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import { advanceRunningTrip } from "../../src/simulation/movement/TripMovement.js";
import { resolveTripWorldPosition } from "../../src/simulation/movement/TripWorldPosition.js";
import { createTestVehicleModel } from "../helpers/TestVehicle.js";

function fixture(direction: "forward" | "reverse" = "forward") {
  const regionId = ids.region("region.000001");
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");
  const roadId = ids.roadSegment("road.000001");

  const graphResult = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: { minXM: 0, minYM: 0, maxXM: 1000, maxYM: 1000 },
        active: true
      }
    ],
    [
      { id: a, regionId, type: "junction", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: b, regionId, type: "junction", name: "B", position: { xM: 1000, yM: 0 }, active: true }
    ],
    [
      {
        id: roadId,
        regionId,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      }
    ]
  );
  if (!graphResult.ok) throw graphResult.error;

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
        direction,
        fromNodeId: direction === "forward" ? a : b,
        toNodeId: direction === "forward" ? b : a
      }
    ],
    routingPreference: "shortest_distance",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  const trip: TripInstance = {
    id: ids.trip("trip.000000000001"),
    routeId: route.id,
    servicePlanId: ids.servicePlan("service_plan.00000001"),
    vehicleId: ids.vehicle("vehicle.00000001"),
    driverId: ids.staff("staff.00000001"),
    status: "running",
    plannedDepartureGameSecond: units.gameSecond(0),
    actualDepartureGameSecond: units.gameSecond(0),
    actualArrivalGameSecond: null,
    position: {
      activeRoadSegmentIndex: 0,
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: units.gameSecond(0)
    },
    onboardPassengerGroups: [],
    recoveryStationId: null,
    delaySeconds: units.gameSecond(0)
  };

  const model: VehicleModel = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    seatCapacity: 20,
    maxSpeedMps: units.speedMps(30)
  });

  return {
    graph: graphResult.value,
    runtime: new WorldRuntimeState(),
    route,
    trip,
    model,
    roadId
  };
}

test("movement respects road limit and runtime speed multiplier", () => {
  const f = fixture();

  f.runtime.setRoadState(f.roadId, {
    status: "open",
    speedMultiplierPermille: units.permille(500)
  });

  const moved = advanceRunningTrip(
    f.trip,
    f.route,
    f.model,
    f.graph,
    f.runtime,
    units.gameSecond(10)
  );

  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(Number(moved.value.trip.position.offsetOnSegmentM), 100);
});

test("closed road consumes time as waiting without changing road progress", () => {
  const f = fixture();

  f.runtime.setRoadState(f.roadId, {
    status: "closed",
    speedMultiplierPermille: units.permille(1000)
  });

  const moved = advanceRunningTrip(
    f.trip,
    f.route,
    f.model,
    f.graph,
    f.runtime,
    units.gameSecond(60)
  );

  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(Number(moved.value.trip.position.offsetOnSegmentM), 0);
  assert.equal(Number(moved.value.trip.position.lastUpdatedGameSecond), 60);
  assert.equal(moved.value.blockedRoadSegmentId, f.roadId);
});

test("reverse PathLeg derives world position from the opposite road endpoint", () => {
  const f = fixture("reverse");

  const moved = advanceRunningTrip(
    f.trip,
    f.route,
    f.model,
    f.graph,
    f.runtime,
    units.gameSecond(10)
  );
  assert.equal(moved.ok, true);
  if (!moved.ok) return;

  const point = resolveTripWorldPosition(
    moved.value.trip,
    f.route,
    f.graph
  );

  assert.ok(point);
  assert.equal(point.xM, 800);
});

test("movement completion records final boundary and exact arrival second", () => {
  const f = fixture();

  const moved = advanceRunningTrip(
    f.trip,
    f.route,
    f.model,
    f.graph,
    f.runtime,
    units.gameSecond(100)
  );

  assert.equal(moved.ok, true);
  if (!moved.ok) return;

  assert.equal(moved.value.completed, true);
  assert.equal(moved.value.trip.status, "completed");
  assert.equal(Number(moved.value.trip.actualArrivalGameSecond), 50);
  assert.deepEqual(
    moved.value.reachedBoundaries.map((value) => value.pathLegBoundaryIndex),
    [1]
  );
});
