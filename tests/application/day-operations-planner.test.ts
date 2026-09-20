import assert from "node:assert/strict";
import test from "node:test";

import {
  ids,
  type RouteId,
  type ServicePlanId,
  type StaffId,
  type StationId,
  type VehicleId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../src/domain/schedule/ServicePlan.js";
import type { Driver } from "../../src/domain/staff/Driver.js";
import type { Station } from "../../src/domain/station/Station.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { DayOperationsPlanner } from "../../src/application/services/DayOperationsPlanner.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import { createTestFinanceRepository } from "../helpers/TestFinance.js";
import { createTestFleetTaskRepository,
  createTestOperationsScheduleRepository
} from "../helpers/TestOperations.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository
} from "../helpers/TestVehicle.js";

interface FixtureOptions {
  readonly outboundDepartures: readonly number[];
  readonly inboundDepartures?: readonly number[];
  readonly vehicleEnergyUnits?: number;
  readonly nextMaintenanceMileageM?: number;
  readonly includeDriver?: boolean;
  readonly minimumDriverRestSeconds?: number;
}

function fixture(options: FixtureOptions) {
  const companyId = ids.company("company.00000001");
  const stationA = ids.station("station.000001");
  const stationB = ids.station("station.000002");
  const nodeA = ids.worldNode("location.000001");
  const nodeB = ids.worldNode("location.000002");
  const regionId = ids.region("region.000001");
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

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: stationA
  };

  const stations = new Map<StationId, Station>([
    [
      stationA,
      {
        id: stationA,
        name: "A站",
        worldNodeId: nodeA,
        ownerCompanyId: companyId,
        status: "active"
      }
    ],
    [
      stationB,
      {
        id: stationB,
        name: "B站",
        worldNodeId: nodeB,
        ownerCompanyId: companyId,
        status: "active"
      }
    ]
  ]);

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

  const routes = new Map<RouteId, PassengerRoute>([
    [outbound.id, outbound],
    [inbound.id, inbound]
  ]);

  const plans = new Map<ServicePlanId, ServicePlan>();
  const outboundPlan: ServicePlan = {
    id: ids.servicePlan("service_plan.00000001"),
    routeId: outbound.id,
    effectiveFromGameSecond: units.gameSecond(0),
    effectiveUntilGameSecond: null,
    calendar: { serviceDays: ["monday"] },
    departurePattern: {
      kind: "fixed_times",
      secondOfDay: options.outboundDepartures
    },
    requiredVehicleClass: "county_midibus",
    status: "active"
  };
  plans.set(outboundPlan.id, outboundPlan);

  if ((options.inboundDepartures?.length ?? 0) > 0) {
    plans.set(
      ids.servicePlan("service_plan.00000002"),
      {
        id: ids.servicePlan("service_plan.00000002"),
        routeId: inbound.id,
        effectiveFromGameSecond: units.gameSecond(0),
        effectiveUntilGameSecond: null,
        calendar: { serviceDays: ["monday"] },
        departurePattern: {
          kind: "fixed_times",
          secondOfDay: options.inboundDepartures ?? []
        },
        requiredVehicleClass: "county_midibus",
        status: "active"
      }
    );
  }

  const model = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20),
    drivingEnergyUnitsPer100Km: 20_000,
    minimumDispatchEnergyUnits: 5_000
  });

  const vehicle = createTestOwnedVehicle({
    id: ids.vehicle("vehicle.00000001"),
    companyId,
    modelId: model.id,
    depotStationId: stationA,
    energyUnits: options.vehicleEnergyUnits ?? 100_000,
    nextMaintenanceMileageM:
      options.nextMaintenanceMileageM ?? 20_000_000
  });

  const drivers = new Map<StaffId, Driver>();
  if (options.includeDriver !== false) {
    const driver = createTestDriver({
      id: ids.staff("staff.00000001"),
      companyId,
      stationId: stationA,
      qualifiedVehicleClasses: ["county_midibus"]
    });
    drivers.set(driver.id, driver);
  }

  const vehicles = new Map<VehicleId, OwnedVehicle>([
    [vehicle.id, vehicle]
  ]);
  const runtime = new WorldRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => id === companyId ? company : undefined,
      save: () => undefined
    },
    finance: createTestFinanceRepository(),
    fleetTasks: createTestFleetTaskRepository(),
    operationsSchedules: createTestOperationsScheduleRepository(),
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => new PassengerRuntimeState(),
      replace: () => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: (company, code) =>
        [...routes.values()].find(
          (route) =>
            route.companyId === company &&
            route.code === code
        ),
      findActive: () => [...routes.values()],
      save: (route) => routes.set(route.id, route)
    },
    servicePlans: {
      getById: (id) => plans.get(id),
      findByRoute: (routeId) =>
        [...plans.values()].filter(
          (plan) => plan.routeId === routeId
        ),
      save: (plan) => plans.set(plan.id, plan)
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      findDriversByCompany: (company) =>
        [...drivers.values()].filter(
          (driver) => driver.companyId === company
        ),
      saveDriver: (driver) => drivers.set(driver.id, driver)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: () => undefined,
      findByServicePlanAndDeparture: () => undefined,
      findByVehicle: () => [],
      findByDriver: () => [],
      findRunning: () => [],
      save: () => undefined
    },
    vehicleModels: {
      getById: (id) => id === model.id ? model : undefined
    },
    vehicles: {
      getById: (id) => vehicles.get(id),
      findByCompany: (company) =>
        [...vehicles.values()].filter(
          (value) => value.companyId === company
        ),
      save: (value) => vehicles.set(value.id, value)
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graph.value,
      replace: () => undefined
    },
    worldRuntime: {
      get: () => runtime,
      replace: () => undefined
    }
  };

  const planner = new DayOperationsPlanner(repositories, {
    vehicleTurnaroundSeconds: () => 60,
    driverTurnaroundSeconds: () => 60,
    passengerBoardingLeadSeconds: () => 0,
    minimumDriverRestSeconds: () =>
      options.minimumDriverRestSeconds ?? 3600,
    maximumContinuousDrivingSeconds: () => 14_400,
    maximumDutySeconds: () => 36_000,
    refuelServiceSeconds: () => 120,
    maintenanceServiceSeconds: () => 180,
    recoveryServiceSeconds: () => 600
  });

  return { planner, companyId };
}

test("planner chains one vehicle and one driver across a feasible round trip day", () => {
  const f = fixture({
    outboundDepartures: [1000],
    inboundDepartures: [1200]
  });

  const result = f.planner.planCompanyDay({
    companyId: f.companyId,
    gameDay: 1,
    generatedAtGameSecond: units.gameSecond(0)
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.stats.requestedTrips, 2);
  assert.equal(result.value.stats.coveredTrips, 2);
  assert.equal(result.value.stats.uncoveredTrips, 0);
  assert.equal(result.value.stats.vehiclesUsed, 1);
  assert.equal(result.value.stats.driversUsed, 1);
  assert.equal(
    result.value.actions.filter(
      (action) => action.kind === "deadhead"
    ).length,
    0
  );
});

test("planner inserts a real deadhead when consecutive trips start at the same terminal", () => {
  const f = fixture({
    outboundDepartures: [1000, 1400]
  });

  const result = f.planner.planCompanyDay({
    companyId: f.companyId,
    gameDay: 1,
    generatedAtGameSecond: units.gameSecond(0)
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.stats.coveredTrips, 2);
  const deadhead = result.value.actions.find(
    (action) => action.kind === "deadhead"
  );
  assert.ok(deadhead);
  assert.equal(Number(deadhead?.distanceM), 1000);
  assert.equal(Number(deadhead?.startsAtGameSecond), 1300);
  assert.equal(Number(deadhead?.endsAtGameSecond), 1400);
});

test("planner inserts maintenance and refuel before a departure when both are required", () => {
  const f = fixture({
    outboundDepartures: [1000],
    vehicleEnergyUnits: 5_100,
    nextMaintenanceMileageM: 500
  });

  const result = f.planner.planCompanyDay({
    companyId: f.companyId,
    gameDay: 1,
    generatedAtGameSecond: units.gameSecond(0)
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.stats.coveredTrips, 1);
  assert.ok(
    result.value.actions.some(
      (action) => action.kind === "maintenance"
    )
  );
  assert.ok(
    result.value.actions.some(
      (action) => action.kind === "refuel"
    )
  );
  assert.ok(
    result.value.actions.some(
      (action) => action.kind === "passenger_trip"
    )
  );
});

test("planner reports an uncovered trip when no qualified driver exists", () => {
  const f = fixture({
    outboundDepartures: [1000],
    includeDriver: false
  });

  const result = f.planner.planCompanyDay({
    companyId: f.companyId,
    gameDay: 1,
    generatedAtGameSecond: units.gameSecond(0)
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.stats.requestedTrips, 1);
  assert.equal(result.value.stats.coveredTrips, 0);
  assert.equal(result.value.stats.uncoveredTrips, 1);
  assert.equal(result.value.tripAssignments[0]?.coverage, "uncovered");
  assert.equal(result.value.issues[0]?.code, "NO_DRIVER");
});
