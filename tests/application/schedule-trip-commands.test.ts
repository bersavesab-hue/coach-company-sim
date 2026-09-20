import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type RouteId,
  type ServicePlanId,
  type StaffId,
  type StationId,
  type TripId,
  type VehicleId,
  type VehicleModelId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../src/domain/schedule/ServicePlan.js";
import type { Driver } from "../../src/domain/staff/Driver.js";
import type { Station } from "../../src/domain/station/Station.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import { createTestFinanceRepository, zeroEconomicPolicy } from "../helpers/TestFinance.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository,
  zeroVehicleLifecyclePolicy
} from "../helpers/TestVehicle.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import {
  createTestFleetTaskRepository,
  zeroOperationsPolicy
} from "../helpers/TestOperations.js";

function fixture() {
  const company: Company = {
    id: ids.company("company.00000001"),
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: null
  };

  const regionId = ids.region("region.000001");
  const n1 = ids.worldNode("location.000001");
  const n2 = ids.worldNode("location.000002");

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
      { id: n2, regionId, type: "bus_station", name: "B", position: { xM: 1000, yM: 0 }, active: true }
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
      }
    ]
  );
  if (!graphResult.ok) throw graphResult.error;

  const s1: Station = {
    id: ids.station("station.000001"),
    name: "A站",
    worldNodeId: n1,
    ownerCompanyId: null,
    status: "active"
  };
  const s2: Station = {
    id: ids.station("station.000002"),
    name: "B站",
    worldNodeId: n2,
    ownerCompanyId: null,
    status: "active"
  };

  const route: PassengerRoute = {
    id: ids.route("route.00000001"),
    companyId: company.id,
    code: "K01",
    type: "county",
    stopPoints: [
      { stationId: s1.id, pathLegBoundaryIndex: 0 },
      { stationId: s2.id, pathLegBoundaryIndex: 1 }
    ],
    pathLegs: [
      {
        roadSegmentId: ids.roadSegment("road.000001"),
        direction: "forward",
        fromNodeId: n1,
        toNodeId: n2
      }
    ],
    routingPreference: "shortest_distance",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  const model: VehicleModel = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    seatCapacity: 6,
    maxSpeedMps: units.speedMps(25)
  });

  const vehicle: OwnedVehicle = createTestOwnedVehicle({
    id: ids.vehicle("vehicle.00000001"),
    companyId: company.id,
    modelId: model.id,
    depotStationId: s1.id,
    status: "available",
    energyUnits: 100_000
  });

  const driver: Driver = createTestDriver({
    id: ids.staff("staff.00000001"),
    companyId: company.id,
    stationId: s1.id,
    qualifiedVehicleClasses: ["county_midibus"]
  });

  const companies = new Map<CompanyId, Company>([[company.id, company]]);
  const routes = new Map<RouteId, PassengerRoute>([[route.id, route]]);
  const plans = new Map<ServicePlanId, ServicePlan>();
  const trips = new Map<TripId, TripInstance>();
  const vehicles = new Map<VehicleId, OwnedVehicle>([[vehicle.id, vehicle]]);
  const models = new Map<VehicleModelId, VehicleModel>([[model.id, model]]);
  const drivers = new Map<StaffId, Driver>([[driver.id, driver]]);
  const stations = new Map<StationId, Station>([[s1.id, s1], [s2.id, s2]]);
  const worldRuntime = new WorldRuntimeState();
  const passengerRuntime = new PassengerRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => companies.get(id),
      save: (value) => companies.set(value.id, value)
    },
    finance: createTestFinanceRepository(),
    fleetTasks: createTestFleetTaskRepository(),
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => passengerRuntime,
      replace: (_state) => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: (companyId, code) =>
        [...routes.values()].find(
          (value) => value.companyId === companyId && value.code === code
        ),
      findActive: () =>
        [...routes.values()].filter((value) => value.status === "active"),
      save: (value) => routes.set(value.id, value)
    },
    servicePlans: {
      getById: (id) => plans.get(id),
      findByRoute: (routeId) =>
        [...plans.values()].filter((value) => value.routeId === routeId),
      save: (value) => plans.set(value.id, value)
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      findDriversByCompany: (company) =>
        [...drivers.values()].filter(
          (value) => value.companyId === company
        ),
      saveDriver: (value) => drivers.set(value.id, value)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: (planId, departure) =>
        [...trips.values()].find(
          (value) =>
            value.servicePlanId === planId &&
            value.plannedDepartureGameSecond === departure
        ),
      findByVehicle: (vehicleId) =>
        [...trips.values()].filter((value) => value.vehicleId === vehicleId),
      findByDriver: (driverId) =>
        [...trips.values()].filter((value) => value.driverId === driverId),
      findRunning: () =>
        [...trips.values()].filter((value) => value.status === "running"),
      save: (value) => trips.set(value.id, value)
    },
    vehicleModels: {
      getById: (id) => models.get(id)
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
      get: () => graphResult.value,
      replace: (_world) => undefined
    },
    worldRuntime: {
      get: () => worldRuntime,
      replace: (_state) => undefined
    }
  };

  let planSequence = 0;
  let tripSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000002"),
    nextServicePlanId() {
      planSequence += 1;
      return ids.servicePlan(
        `service_plan.${String(planSequence).padStart(8, "0")}`
      );
    },
    nextTripId() {
      tripSequence += 1;
      return ids.trip(
        `trip.${String(tripSequence).padStart(12, "0")}`
      );
    },
    nextFleetTaskId() {
      return ids.fleetTask("fleet_task.00000001");
    },
    nextVehicleId() {
      return ids.vehicle("vehicle.00000002");
    }
  };

  const app = createApplication({
    repositories,
    ids: allocator,
    passengerDemandPolicy: {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    economicPolicy: zeroEconomicPolicy,
    vehicleLifecyclePolicy: zeroVehicleLifecyclePolicy,
    operationsPolicy: zeroOperationsPolicy
  });

  return {
    app,
    company,
    route,
    vehicle,
    driver,
    s1,
    s2,
    passengerRuntime,
    repositories
  };
}

function command<T>(
  id: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  issuedAt: number,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(`command.${String(id).padStart(8, "0")}`),
    type,
    issuedAtGameSecond: units.gameSecond(issuedAt),
    actorCompanyId: companyId,
    payload
  };
}

async function createPlanAndTrip() {
  const f = fixture();

  const planResult = await f.app.commands.dispatch(
    command(1, "servicePlan.create", f.company.id, 100, {
      routeId: f.route.id,
      effectiveFromGameSecond: units.gameSecond(0),
      effectiveUntilGameSecond: null,
      calendar: {
        serviceDays: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday"
        ]
      },
      departurePattern: {
        kind: "fixed_times",
        secondOfDay: [6 * 3600]
      },
      requiredVehicleClass: "county_midibus"
    })
  );
  if (!planResult.ok) assert.fail(planResult.error.message);

  const plan = planResult.value as ServicePlan;

  const tripResult = await f.app.commands.dispatch(
    command(2, "trip.prepare", f.company.id, 200, {
      servicePlanId: plan.id,
      plannedDepartureGameSecond: units.gameSecond(6 * 3600)
    })
  );
  if (!tripResult.ok) assert.fail(tripResult.error.message);

  return {
    ...f,
    plan,
    trip: tripResult.value as TripInstance
  };
}

test("trip assignment enforces vehicle class and driver qualification", async () => {
  const f = await createPlanAndTrip();

  const assignedVehicle = await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  assert.equal(assignedVehicle.ok, true);

  const assignedDriver = await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );
  assert.equal(assignedDriver.ok, true);
});

test("start boarding loads passengers up to seat capacity", async () => {
  const f = await createPlanAndTrip();
  f.passengerRuntime.addWaiting(f.s1.id, f.s2.id, 9);

  await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );

  const boarding = await f.app.commands.dispatch(
    command(5, "trip.startBoarding", f.company.id, 21000, {
      tripId: f.trip.id
    })
  );

  assert.equal(boarding.ok, true);
  if (!boarding.ok) return;

  const trip = boarding.value as TripInstance;
  assert.equal(trip.onboardPassengerGroups[0]?.count, 6);
  assert.equal(f.passengerRuntime.waitingCount(f.s1.id, f.s2.id), 3);
});

test("boarding and departure move trip, vehicle and driver together", async () => {
  const f = await createPlanAndTrip();

  await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );
  await f.app.commands.dispatch(
    command(5, "trip.startBoarding", f.company.id, 21000, {
      tripId: f.trip.id
    })
  );

  const departed = await f.app.commands.dispatch(
    command(6, "trip.depart", f.company.id, 21720, {
      tripId: f.trip.id
    })
  );
  assert.equal(departed.ok, true);
  if (!departed.ok) return;

  const trip = departed.value as TripInstance;
  assert.equal(trip.status, "running");
  assert.equal(Number(trip.delaySeconds), 120);
  assert.equal(
    f.repositories.vehicles.getById(f.vehicle.id)?.status,
    "running"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driver.id)?.status,
    "driving"
  );
});

test("trip cancellation releases assigned resources", async () => {
  const f = await createPlanAndTrip();

  await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );

  const cancelled = await f.app.commands.dispatch(
    command(5, "trip.cancel", f.company.id, 500, {
      tripId: f.trip.id
    })
  );

  assert.equal(cancelled.ok, true);
  assert.equal(
    f.repositories.vehicles.getById(f.vehicle.id)?.status,
    "available"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driver.id)?.status,
    "available"
  );
});
