import assert from "node:assert/strict";
import test from "node:test";

import {
  ids,
  type RouteId,
  type TripId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { DispatchPlanningService } from "../../src/application/services/DispatchPlanningService.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import { createTestFinanceRepository } from "../helpers/TestFinance.js";
import { createTestFleetTaskRepository } from "../helpers/TestOperations.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository
} from "../helpers/TestVehicle.js";

function fixture() {
  const companyId = ids.company("company.00000001");
  const stationA = ids.station("station.000001");
  const stationB = ids.station("station.000002");
  const regionId = ids.region("region.000001");
  const nodeA = ids.worldNode("location.000001");
  const nodeB = ids.worldNode("location.000002");
  const roadId = ids.roadSegment("road.000001");

  const graph = WorldGraph.create(
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
      {
        id: nodeA,
        regionId,
        type: "bus_station",
        name: "A",
        position: { xM: 0, yM: 0 },
        active: true
      },
      {
        id: nodeB,
        regionId,
        type: "bus_station",
        name: "B",
        position: { xM: 1000, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: roadId,
        regionId,
        fromNodeId: nodeA,
        toNodeId: nodeB,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(10),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      }
    ]
  );
  if (!graph.ok) throw graph.error;

  const outbound: PassengerRoute = {
    id: ids.route("route.00000001"),
    companyId,
    code: "A-B",
    type: "county",
    stopPoints: [
      { stationId: stationA, pathLegBoundaryIndex: 0 },
      { stationId: stationB, pathLegBoundaryIndex: 1 }
    ],
    pathLegs: [
      {
        roadSegmentId: roadId,
        direction: "forward",
        fromNodeId: nodeA,
        toNodeId: nodeB
      }
    ],
    routingPreference: "fastest_time",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  const inbound: PassengerRoute = {
    ...outbound,
    id: ids.route("route.00000002"),
    code: "B-A",
    stopPoints: [
      { stationId: stationB, pathLegBoundaryIndex: 0 },
      { stationId: stationA, pathLegBoundaryIndex: 1 }
    ],
    pathLegs: [
      {
        roadSegmentId: roadId,
        direction: "reverse",
        fromNodeId: nodeB,
        toNodeId: nodeA
      }
    ]
  };

  const model = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20)
  });

  const vehicle = createTestOwnedVehicle({
    id: ids.vehicle("vehicle.00000001"),
    companyId,
    modelId: model.id,
    depotStationId: stationA,
    energyUnits: 100_000
  });

  const driver = createTestDriver({
    id: ids.staff("staff.00000001"),
    companyId,
    stationId: stationA,
    qualifiedVehicleClasses: ["county_midibus"]
  });

  const firstTrip: TripInstance = {
    id: ids.trip("trip.000000000001"),
    routeId: outbound.id,
    servicePlanId: ids.servicePlan("service_plan.00000001"),
    vehicleId: vehicle.id,
    driverId: driver.id,
    status: "planned",
    plannedDepartureGameSecond: units.gameSecond(1000),
    actualDepartureGameSecond: null,
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

  const trips = new Map<TripId, TripInstance>([[firstTrip.id, firstTrip]]);
  const routes = new Map<RouteId, PassengerRoute>([
    [outbound.id, outbound],
    [inbound.id, inbound]
  ]);

  const repositories: RepositoryBundle = {
    companies: {
      getById: () => undefined,
      save: () => undefined
    },
    finance: createTestFinanceRepository(),
    fleetTasks: createTestFleetTaskRepository(),
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => new PassengerRuntimeState(),
      replace: () => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: () => undefined,
      findActive: () => [...routes.values()],
      save: () => undefined
    },
    servicePlans: {
      getById: () => undefined,
      findByRoute: () => [],
      save: () => undefined
    },
    staff: {
      getDriverById: (id) => id === driver.id ? driver : undefined,
      findDriversByCompany: (company) =>
        company === companyId ? [driver] : [],
      saveDriver: () => undefined
    },
    stations: {
      getById: () => undefined
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: () => undefined,
      findByVehicle: (vehicleId) =>
        [...trips.values()].filter((trip) => trip.vehicleId === vehicleId),
      findByDriver: (driverId) =>
        [...trips.values()].filter((trip) => trip.driverId === driverId),
      findRunning: () => [],
      save: (trip) => trips.set(trip.id, trip)
    },
    vehicleModels: {
      getById: (id) => id === model.id ? model : undefined
    },
    vehicles: {
      getById: (id) => id === vehicle.id ? vehicle : undefined,
      findByCompany: (company) =>
        company === companyId ? [vehicle] : [],
      save: () => undefined
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graph.value,
      replace: () => undefined
    },
    worldRuntime: {
      get: () => new WorldRuntimeState(),
      replace: () => undefined
    }
  };

  const planner = new DispatchPlanningService(repositories, {
    vehicleTurnaroundSeconds: () => 60,
    driverTurnaroundSeconds: () => 60,
    minimumDriverRestSeconds: () => 3600,
    maximumContinuousDrivingSeconds: () => 14_400,
    maximumDutySeconds: () => 36_000,
    refuelServiceSeconds: () => 600,
    maintenanceServiceSeconds: () => 1800,
    recoveryServiceSeconds: () => 1200
  });

  return {
    planner,
    inbound,
    vehicle,
    driver
  };
}

function candidate(
  routeId: RouteId,
  departureSecond: number,
  idSuffix: string
): TripInstance {
  return {
    id: ids.trip(`trip.${idSuffix}`),
    routeId,
    servicePlanId: ids.servicePlan("service_plan.00000002"),
    vehicleId: null,
    driverId: null,
    status: "planned",
    plannedDepartureGameSecond: units.gameSecond(departureSecond),
    actualDepartureGameSecond: null,
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

test("future vehicle and driver reservations allow a real chained duty", () => {
  const f = fixture();
  const next = candidate(
    f.inbound.id,
    1160,
    "000000000002"
  );

  assert.equal(
    f.planner.validateVehicleReservation(
      next,
      f.vehicle,
      createTestVehicleModel({
        id: f.vehicle.modelId,
        serviceClass: "county_midibus",
        maxSpeedMps: units.speedMps(20)
      })
    ).ok,
    true
  );

  assert.equal(
    f.planner.validateDriverReservation(
      next,
      f.driver,
      createTestVehicleModel({
        id: f.vehicle.modelId,
        serviceClass: "county_midibus",
        maxSpeedMps: units.speedMps(20)
      })
    ).ok,
    true
  );
});

test("one second short of turnaround is rejected instead of teleporting resources", () => {
  const f = fixture();
  const tooEarly = candidate(
    f.inbound.id,
    1159,
    "000000000003"
  );

  const vehicleResult = f.planner.validateVehicleReservation(
    tooEarly,
    f.vehicle,
    createTestVehicleModel({
      id: f.vehicle.modelId,
      serviceClass: "county_midibus",
      maxSpeedMps: units.speedMps(20)
    })
  );
  assert.equal(vehicleResult.ok, false);
  if (!vehicleResult.ok) {
    assert.equal(vehicleResult.error.code, "VEHICLE_NOT_AVAILABLE");
  }

  const driverResult = f.planner.validateDriverReservation(
    tooEarly,
    f.driver,
    createTestVehicleModel({
      id: f.vehicle.modelId,
      serviceClass: "county_midibus",
      maxSpeedMps: units.speedMps(20)
    })
  );
  assert.equal(driverResult.ok, false);
  if (!driverResult.ok) {
    assert.equal(driverResult.error.code, "DRIVER_NOT_AVAILABLE");
  }
});
