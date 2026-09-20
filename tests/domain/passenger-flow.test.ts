import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import { serveRouteStop, totalOnboardPassengers } from "../../src/simulation/passenger/PassengerFlow.js";

const a = ids.station("station.000001");
const b = ids.station("station.000002");
const c = ids.station("station.000003");

const route: PassengerRoute = {
  id: ids.route("route.00000001"),
  companyId: ids.company("company.00000001"),
  code: "K01",
  type: "county",
  stopPoints: [
    { stationId: a, pathLegBoundaryIndex: 0 },
    { stationId: b, pathLegBoundaryIndex: 1 },
    { stationId: c, pathLegBoundaryIndex: 2 }
  ],
  pathLegs: [
    {
      roadSegmentId: ids.roadSegment("road.000001"),
      direction: "forward",
      fromNodeId: ids.worldNode("location.000001"),
      toNodeId: ids.worldNode("location.000002")
    },
    {
      roadSegmentId: ids.roadSegment("road.000002"),
      direction: "forward",
      fromNodeId: ids.worldNode("location.000002"),
      toNodeId: ids.worldNode("location.000003")
    }
  ],
  routingPreference: "shortest_distance",
  farePolicyId: ids.farePolicy("fare_policy.000001"),
  requiredLicenseIds: [],
  status: "active"
};

function trip(): TripInstance {
  return {
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
}

test("boarding respects capacity and leaves overflow waiting", () => {
  const runtime = new PassengerRuntimeState();
  runtime.addWaiting(a, b, 4);
  runtime.addWaiting(a, c, 5);

  const result = serveRouteStop(trip(), route, 0, 6, runtime);

  assert.equal(result.boardedCount, 6);
  assert.equal(result.leftWaitingCount, 3);
  assert.equal(totalOnboardPassengers(result.trip), 6);
  assert.equal(runtime.waitingCount(a, c), 3);
});

test("intermediate stop alights destination group before boarding more", () => {
  const runtime = new PassengerRuntimeState();
  runtime.addWaiting(b, c, 3);

  const withPassengers: TripInstance = {
    ...trip(),
    onboardPassengerGroups: [
      { destinationStationId: b, count: 4 },
      { destinationStationId: c, count: 2 }
    ]
  };

  const result = serveRouteStop(withPassengers, route, 1, 6, runtime);

  assert.equal(result.alightedCount, 4);
  assert.equal(result.boardedCount, 3);
  assert.equal(totalOnboardPassengers(result.trip), 5);
  assert.equal(runtime.waitingCount(b, c), 0);
});
