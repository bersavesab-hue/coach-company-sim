import assert from "node:assert/strict";
import test from "node:test";

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
import { DomainEventBus } from "../../src/application/events/DomainEventBus.js";
import { FinanceCoordinator } from "../../src/application/finance/FinanceCoordinator.js";
import { VehicleLifecycleCoordinator } from "../../src/application/vehicle/VehicleLifecycleCoordinator.js";
import { createTestFinanceRepository, zeroEconomicPolicy } from "../helpers/TestFinance.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import {
  createTestFleetTaskRepository,
  zeroOperationsPolicy
} from "../helpers/TestOperations.js";
import { FleetOperationsCoordinator } from "../../src/application/operations/FleetOperationsCoordinator.js";
import { zeroVehicleLifecyclePolicy } from "../helpers/TestVehicle.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository
} from "../helpers/TestVehicle.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { SimulationCoordinator } from "../../src/application/simulation/SimulationCoordinator.js";
import { VehicleSpatialIndex } from "../../src/application/spatial/VehicleSpatialIndex.js";

function fixture() {
  const companyId = ids.company("company.00000001");
  const routeId = ids.route("route.00000001");
  const tripId = ids.trip("trip.000000000001");
  const vehicleId = ids.vehicle("vehicle.00000001");
  const driverId = ids.staff("staff.00000001");
  const modelId = ids.vehicleModel("vehicle_model.000001");
  const regionId = ids.region("region.000001");
  const stationA = ids.station("station.000001");
  const stationB = ids.station("station.000002");
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
      { id: b, regionId, type: "junction", name: "B", position: { xM: 100, yM: 0 }, active: true }
    ],
    [
      {
        id: roadId,
        regionId,
        fromNodeId: a,
        toNodeId: b,
        lengthM: units.distanceM(100),
        speedLimitMps: units.speedMps(10),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      }
    ]
  );
  if (!graphResult.ok) throw graphResult.error;

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: null
  };

  const route: PassengerRoute = {
    id: routeId,
    companyId,
    code: "K01",
    type: "county",
    stopPoints: [
      { stationId: stationA, pathLegBoundaryIndex: 0 },
      { stationId: stationB, pathLegBoundaryIndex: 1 }
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

  const plan: ServicePlan = {
    id: ids.servicePlan("service_plan.00000001"),
    routeId,
    effectiveFromGameSecond: units.gameSecond(0),
    effectiveUntilGameSecond: null,
    calendar: { serviceDays: ["monday"] },
    departurePattern: { kind: "fixed_times", secondOfDay: [0] },
    requiredVehicleClass: "county_midibus",
    status: "active"
  };

  const vehicle: OwnedVehicle = createTestOwnedVehicle({
    id: vehicleId,
    companyId,
    modelId,
    status: "running",
    activeTripId: tripId,
    energyUnits: 100_000
  });

  const model: VehicleModel = createTestVehicleModel({
    id: modelId,
    serviceClass: "county_midibus",
    seatCapacity: 20,
    maxSpeedMps: units.speedMps(20)
  });

  const driver: Driver = createTestDriver({
    id: driverId,
    companyId,
    stationId: null,
    status: "driving",
    activeTripId: tripId,
    qualifiedVehicleClasses: ["county_midibus"]
  });

  const trip: TripInstance = {
    id: tripId,
    routeId,
    servicePlanId: plan.id,
    vehicleId,
    driverId,
    status: "running",
    plannedDepartureGameSecond: units.gameSecond(0),
    actualDepartureGameSecond: units.gameSecond(0),
    actualArrivalGameSecond: null,
    position: {
      activeRoadSegmentIndex: 0,
      offsetOnSegmentM: units.distanceM(0),
      lastUpdatedGameSecond: units.gameSecond(0)
    },
    onboardPassengerGroups: [
      { destinationStationId: stationB, count: 5 }
    ],
    recoveryStationId: null,
    delaySeconds: units.gameSecond(0)
  };

  const companies = new Map<CompanyId, Company>([[companyId, company]]);
  const routes = new Map<RouteId, PassengerRoute>([[routeId, route]]);
  const plans = new Map<ServicePlanId, ServicePlan>([[plan.id, plan]]);
  const trips = new Map<TripId, TripInstance>([[tripId, trip]]);
  const vehicles = new Map<VehicleId, OwnedVehicle>([[vehicleId, vehicle]]);
  const models = new Map<VehicleModelId, VehicleModel>([[modelId, model]]);
  const drivers = new Map<StaffId, Driver>([[driverId, driver]]);
  const stations = new Map<StationId, Station>();
  const runtime = new WorldRuntimeState();
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
      findByCompanyAndCode: () => undefined,
      findActive: () => [...routes.values()],
      save: (value) => routes.set(value.id, value)
    },
    servicePlans: {
      getById: (id) => plans.get(id),
      findByRoute: (id) =>
        [...plans.values()].filter((value) => value.routeId === id),
      save: (value) => plans.set(value.id, value)
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      saveDriver: (value) => drivers.set(value.id, value)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: () => undefined,
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
      save: (value) => vehicles.set(value.id, value)
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graphResult.value,
      replace: () => undefined
    },
    worldRuntime: {
      get: () => runtime,
      replace: () => undefined
    }
  };

  const events = new DomainEventBus();
  const index = new VehicleSpatialIndex();
  const finance = new FinanceCoordinator(
    repositories,
    events,
    zeroEconomicPolicy
  );
  finance.initialize();

  const lifecycle = new VehicleLifecycleCoordinator(
    repositories,
    events
  );
  void lifecycle;

  const fleetOperations = new FleetOperationsCoordinator(
    repositories,
    events,
    zeroEconomicPolicy,
    zeroVehicleLifecyclePolicy
  );

  const simulation = new SimulationCoordinator(
    repositories,
    events,
    {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    finance,
    fleetOperations,
    zeroOperationsPolicy,
    index
  );
  simulation.rebuildVehicleIndex();

  return {
    repositories,
    simulation,
    index,
    events,
    tripId,
    vehicleId,
    driverId
  };
}

test("tier cadence can defer background work without changing movement rules", () => {
  const f = fixture();

  const skipped = f.simulation.advanceTo(
    units.gameSecond(100),
    () => "background"
  );
  assert.deepEqual(skipped.advancedTripIds, []);

  const advanced = f.simulation.advanceTo(
    units.gameSecond(300),
    () => "background"
  );
  assert.deepEqual(advanced.completedTripIds, [f.tripId]);
});

test("final stop alights passengers, releases resources and completes trip", () => {
  const f = fixture();
  const eventTypes: string[] = [];
  f.events.subscribe((event) => eventTypes.push(event.type));

  const report = f.simulation.advanceTo(units.gameSecond(20));

  assert.deepEqual(report.completedTripIds, [f.tripId]);
  assert.equal(
    f.repositories.trips.getById(f.tripId)?.onboardPassengerGroups.length,
    0
  );
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.status,
    "available"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driverId)?.status,
    "available"
  );
  assert.deepEqual(eventTypes, [
    "vehicle.energyConsumed",
    "trip.operatingInterval",
    "trip.arrivedAtStop",
    "passengers.alighted",
    "trip.completed"
  ]);
  assert.deepEqual(
    f.index.query({ minXM: 0, minYM: -10, maxXM: 200, maxYM: 10 }),
    []
  );
});

test("running vehicle is queryable from spatial index before completion", () => {
  const f = fixture();

  f.simulation.advanceTo(units.gameSecond(5));

  const visible = f.index.query({
    minXM: 40,
    minYM: -10,
    maxXM: 60,
    maxYM: 10
  });

  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.tripId, f.tripId);
  assert.equal(visible[0]?.xM, 50);
});


test("mechanical failure disrupts a running trip instead of letting it continue", () => {
  const f = fixture();
  const vehicle = f.repositories.vehicles.getById(f.vehicleId);
  assert.ok(vehicle);
  if (!vehicle) return;

  f.repositories.vehicles.save({
    ...vehicle,
    tireConditionPermille: units.permille(0)
  });

  const report = f.simulation.advanceTo(units.gameSecond(5));

  assert.deepEqual(report.blockedTripIds, [f.tripId]);
  assert.equal(
    f.repositories.trips.getById(f.tripId)?.status,
    "disrupted"
  );
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.status,
    "broken"
  );
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.activeIncident?.kind,
    "tire_failure"
  );
  assert.deepEqual(
    f.index.query({
      minXM: 0,
      minYM: -10,
      maxXM: 100,
      maxYM: 10
    }),
    []
  );
});
