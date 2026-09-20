import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type RouteId,
  type StationId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../src/domain/schedule/ServicePlan.js";
import type { Station } from "../../src/domain/station/Station.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import { createTestFinanceRepository, zeroEconomicPolicy } from "../helpers/TestFinance.js";
import {
  createTestVehicleRuntimeRepository,
  zeroVehicleLifecyclePolicy,
  createTestVehicleMarketRepository,
  zeroVehicleMarketPolicy
} from "../helpers/TestVehicle.js";
import {
  createTestFleetTaskRepository,
  zeroOperationsPolicy,
  createTestOperationsScheduleRepository
} from "../helpers/TestOperations.js";

function buildFixture(companyLicenses = [ids.license("license.000001")]) {
  const regionId = ids.region("region.000001");
  const n1 = ids.worldNode("location.000001");
  const n2 = ids.worldNode("location.000002");
  const n3 = ids.worldNode("location.000003");

  const graphResult = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: { minXM: 0, minYM: 0, maxXM: 10000, maxYM: 10000 },
        active: true
      }
    ],
    [
      { id: n1, regionId, type: "bus_station", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: n2, regionId, type: "junction", name: "B", position: { xM: 1000, yM: 0 }, active: true },
      { id: n3, regionId, type: "bus_station", name: "C", position: { xM: 2000, yM: 0 }, active: true }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId,
        fromNodeId: n1,
        toNodeId: n2,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      },
      {
        id: ids.roadSegment("road.000002"),
        regionId,
        fromNodeId: n2,
        toNodeId: n3,
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

  const company: Company = {
    id: ids.company("company.00000001"),
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: companyLicenses,
    homeStationId: null
  };

  const s1: Station = {
    id: ids.station("station.000001"),
    name: "A站",
    worldNodeId: n1,
    ownerCompanyId: null,
    status: "active"
  };
  const s2: Station = {
    id: ids.station("station.000002"),
    name: "C站",
    worldNodeId: n3,
    ownerCompanyId: null,
    status: "active"
  };

  const companies = new Map<CompanyId, Company>([[company.id, company]]);
  const stations = new Map<StationId, Station>([[s1.id, s1], [s2.id, s2]]);
  const routes = new Map<RouteId, PassengerRoute>();
  const passengerRuntime = new PassengerRuntimeState();
  const worldRuntime = new WorldRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => companies.get(id),
      save: (value) => companies.set(value.id, value)
    },
    finance: createTestFinanceRepository(),
    fleetTasks: createTestFleetTaskRepository(),
    operationsSchedules: createTestOperationsScheduleRepository(),
    passengerDemand: {
      all: () => []
    },
    passengerRuntime: {
      get: () => passengerRuntime,
      replace: (_state) => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: (companyId, code) =>
        [...routes.values()].find(
          (route) => route.companyId === companyId && route.code === code
        ),
      findActive: () =>
        [...routes.values()].filter((route) => route.status === "active"),
      save: (route) => routes.set(route.id, route)
    },
    servicePlans: {
      getById: (_id) => undefined as ServicePlan | undefined,
      findByRoute: (_routeId) => [],
      save: (_plan) => undefined
    },
    staff: {
      getDriverById: (_id) => undefined,
      findDriversByCompany: (_companyId) => [],
      saveDriver: (_driver) => undefined
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (_id) => undefined as TripInstance | undefined,
      findByServicePlanAndDeparture: (_planId, _departure) => undefined,
      findByVehicle: () => [],
      findByDriver: () => [],
      findRunning: () => [],
      save: (_trip) => undefined
    },
    vehicleMarket: createTestVehicleMarketRepository(),
    vehicleModels: {
      getById: (_id) => undefined
    },
    vehicles: {
      getById: (_id) => undefined as OwnedVehicle | undefined,
      findByCompany: (_companyId) => [],
      save: (_vehicle) => undefined
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graphResult.value,
      replace: (_world) => undefined
    },
    worldRuntime: {
      get: () => worldRuntime,
      replace: (_state) => undefined
    }
  };

  let routeSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId() {
      routeSequence += 1;
      return ids.route(`route.${String(routeSequence).padStart(8, "0")}`);
    },
    nextServicePlanId() {
      return ids.servicePlan("service_plan.00000001");
    },
    nextTripId() {
      return ids.trip("trip.000000000001");
    },
    nextFleetTaskId() {
      return ids.fleetTask("fleet_task.00000001");
    },
    nextVehicleId() {
      return ids.vehicle("vehicle.00000001");
    }
  };

  const app = createApplication({
    repositories,
    ids: allocator,
    passengerDemandPolicy: {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    economicPolicy: zeroEconomicPolicy,
    vehicleMarketPolicy: zeroVehicleMarketPolicy,
    vehicleLifecyclePolicy: zeroVehicleLifecyclePolicy,
    operationsPolicy: zeroOperationsPolicy
  });

  return { app, company, s1, s2 };
}

function command<T>(
  id: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(`command.${String(id).padStart(8, "0")}`),
    type,
    issuedAtGameSecond: units.gameSecond(id * 10),
    actorCompanyId: companyId,
    payload
  };
}

test("route.create builds stop boundaries and direction-aware road path", async () => {
  const { app, company, s1, s2 } = buildFixture();

  const result = await app.commands.dispatch(
    command(1, "route.create", company.id, {
      companyId: company.id,
      code: "K01",
      routeType: "county",
      orderedStationIds: [s1.id, s2.id],
      routingPreference: "shortest_distance",
      farePolicyId: ids.farePolicy("fare_policy.000001"),
      requiredLicenseIds: [ids.license("license.000001")]
    })
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const route = result.value as PassengerRoute;
  assert.equal(route.pathLegs.length, 2);
  assert.equal(route.pathLegs[0]?.direction, "forward");
  assert.deepEqual(
    route.stopPoints.map((stop) => stop.pathLegBoundaryIndex),
    [0, 2]
  );
});
