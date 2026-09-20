import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { calculateFareCents } from "../../src/domain/finance/FareCalculator.js";
import type { FarePolicy } from "../../src/domain/finance/FarePolicy.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";

test("fare uses canonical road distance and exact OD override", () => {
  const regionId = ids.region("region.000001");
  const a = ids.worldNode("location.000001");
  const b = ids.worldNode("location.000002");
  const c = ids.worldNode("location.000003");
  const stationA = ids.station("station.000001");
  const stationB = ids.station("station.000002");
  const stationC = ids.station("station.000003");

  const graph = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: { minXM: 0, minYM: 0, maxXM: 30000, maxYM: 1000 },
        active: true
      }
    ],
    [
      { id: a, regionId, type: "bus_station", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: b, regionId, type: "bus_station", name: "B", position: { xM: 10000, yM: 0 }, active: true },
      { id: c, regionId, type: "bus_station", name: "C", position: { xM: 25000, yM: 0 }, active: true }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(10000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      },
      {
        id: ids.roadSegment("road.000002"),
        regionId,
        fromNodeId: b,
        toNodeId: c,
        lengthM: units.distanceM(15000),
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
      { stationId: stationA, pathLegBoundaryIndex: 0 },
      { stationId: stationB, pathLegBoundaryIndex: 1 },
      { stationId: stationC, pathLegBoundaryIndex: 2 }
    ],
    pathLegs: [
      {
        roadSegmentId: ids.roadSegment("road.000001"),
        direction: "forward",
        fromNodeId: a,
        toNodeId: b
      },
      {
        roadSegmentId: ids.roadSegment("road.000002"),
        direction: "forward",
        fromNodeId: b,
        toNodeId: c
      }
    ],
    routingPreference: "shortest_distance",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  const policy: FarePolicy = {
    id: route.farePolicyId,
    baseFareCents: units.moneyCents(200),
    perKmCents: units.moneyCents(50),
    minimumFareCents: units.moneyCents(300),
    maximumFareCents: null,
    roundingIncrementCents: 100,
    roundingMode: "nearest",
    pairOverrides: [
      {
        originStationId: stationA,
        destinationStationId: stationB,
        fareCents: units.moneyCents(900)
      }
    ]
  };

  const override = calculateFareCents(
    route,
    stationA,
    stationB,
    graph.value,
    policy
  );
  assert.equal(override.ok, true);
  if (override.ok) assert.equal(Number(override.value), 900);

  const distanceFare = calculateFareCents(
    route,
    stationA,
    stationC,
    graph.value,
    policy
  );
  assert.equal(distanceFare.ok, true);
  if (distanceFare.ok) {
    assert.equal(Number(distanceFare.value), 1500);
  }
});
