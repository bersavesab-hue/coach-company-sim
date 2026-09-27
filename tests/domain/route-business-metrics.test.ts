import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import { units } from "../../src/core/units/Units.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { recordPassengerBoardingMetrics } from "../../src/simulation/passenger/PassengerTripMetrics.js";

test("passenger runtime persists generated and abandoned daily OD flow", () => {
  const origin = ids.station("station.a");
  const destination = ids.station("station.b");
  const state = new PassengerRuntimeState();

  state.recordGenerated(1, origin, destination, 24);
  state.recordAbandoned(1, origin, destination, 5);

  assert.equal(state.generatedCount(1, origin, destination), 24);
  assert.equal(state.abandonedCount(1, origin, destination), 5);

  const restored = PassengerRuntimeState.fromSnapshot(state.snapshot());
  assert.equal(restored.generatedCount(1, origin, destination), 24);
  assert.equal(restored.abandonedCount(1, origin, destination), 5);
});

test("trip boarding metrics use passenger distance rather than snapshot occupancy", () => {
  const regionId = ids.region("region.test");
  const nodeA = ids.worldNode("location.a");
  const nodeB = ids.worldNode("location.b");
  const stationA = ids.station("station.a");
  const stationB = ids.station("station.b");
  const roadId = ids.roadSegment("road.ab");

  const graph = WorldGraph.create(
    [{
      id: regionId,
      name: "测试区",
      level: "province_like",
      parentRegionId: null,
      bounds: { minXM: 0, minYM: 0, maxXM: 10000, maxYM: 1000 },
      active: true
    }],
    [
      { id: nodeA, regionId, type: "bus_station", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: nodeB, regionId, type: "bus_station", name: "B", position: { xM: 10000, yM: 0 }, active: true }
    ],
    [{
      id: roadId,
      regionId,
      fromNodeId: nodeA,
      toNodeId: nodeB,
      lengthM: units.distanceM(10000),
      speedLimitMps: units.speedMps(20),
      roadClass: "county_road",
      direction: "both",
      polyline: [],
      active: true
    }]
  );
  if (!graph.ok) throw graph.error;

  const route: PassengerRoute = {
    id: ids.route("route.test"),
    companyId: ids.company("company.test"),
    code: "T01",
    type: "county",
    stopPoints: [
      { stationId: stationA, pathLegBoundaryIndex: 0 },
      { stationId: stationB, pathLegBoundaryIndex: 1 }
    ],
    pathLegs: [{
      roadSegmentId: roadId,
      direction: "forward",
      fromNodeId: nodeA,
      toNodeId: nodeB
    }],
    routingPreference: "fastest_time",
    farePolicyId: ids.farePolicy("fare_policy.test"),
    requiredLicenseIds: [],
    status: "active"
  };

  const trip: TripInstance = {
    id: ids.trip("trip.test"),
    routeId: route.id,
    servicePlanId: null,
    vehicleId: null,
    driverId: null,
    status: "boarding",
    plannedDepartureGameSecond: units.gameSecond(0),
    actualDepartureGameSecond: null,
    actualArrivalGameSecond: null,
    position: {
      activeRoadSegmentIndex: 0,
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: units.gameSecond(0)
    },
    onboardPassengerGroups: [],
    boardedPassengerCountTotal: 0,
    passengerDistanceMTotal: 0,
    recoveryStationId: null,
    delaySeconds: units.gameSecond(0)
  };

  const updated = recordPassengerBoardingMetrics(
    trip,
    route,
    stationA,
    [{ destinationStationId: stationB, count: 7 }],
    graph.value
  );

  assert.equal(updated.boardedPassengerCountTotal, 7);
  assert.equal(updated.passengerDistanceMTotal, 70000);
});
