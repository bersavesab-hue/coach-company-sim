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
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import {
  createTestFinanceRepository,
  zeroEconomicPolicy
} from "../helpers/TestFinance.js";
import {
  createTestFleetTaskRepository,
  createTestOperationsScheduleRepository
} from "../helpers/TestOperations.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository,
  zeroVehicleLifecyclePolicy
} from "../helpers/TestVehicle.js";

function command<T>(
  sequence: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  gameSecond: number,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(
      `command.${String(sequence).padStart(8, "0")}`
    ),
    type,
    issuedAtGameSecond: units.gameSecond(gameSecond),
    actorCompanyId: companyId,
    payload
  };
}

function simpleFixture() {
  const companyId = ids.company("company.00000001");
  const stationA = ids.station("station.000001");
  const stationB = ids.station("station.000002");
  const nodeA = ids.worldNode("location.000001");
  const nodeB = ids.worldNode("location.000002");
  const regionId = ids.region("region.000001");
  const roadId = ids.roadSegment("road.000001");
  const routeId = ids.route("route.00000001");
  const planId = ids.servicePlan("service_plan.00000001");
  const vehicleId = ids.vehicle("vehicle.00000001");
  const driverId = ids.staff("staff.00000001");
  const modelId = ids.vehicleModel("vehicle_model.000001");

  const graphResult = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: {
          minXM: 0,
          minYM: 0,
          maxXM: 1000,
          maxYM: 1000
        },
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
  if (!graphResult.ok) throw graphResult.error;
  const graph = graphResult.value;

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

  const route: PassengerRoute = {
    id: routeId,
    companyId,
    code: "A-B",
    type: "county",
    stopPoints: [
      {
        stationId: stationA,
        pathLegBoundaryIndex: 0
      },
      {
        stationId: stationB,
        pathLegBoundaryIndex: 1
      }
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

  const servicePlan: ServicePlan = {
    id: planId,
    routeId,
    effectiveFromGameSecond: units.gameSecond(0),
    effectiveUntilGameSecond: null,
    calendar: {
      serviceDays: ["monday"]
    },
    departurePattern: {
      kind: "fixed_times",
      secondOfDay: [1000]
    },
    requiredVehicleClass: "county_midibus",
    status: "active"
  };

  const model = createTestVehicleModel({
    id: modelId,
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20),
    drivingEnergyUnitsPer100Km: 20_000,
    minimumDispatchEnergyUnits: 5_000
  });

  const vehicle = createTestOwnedVehicle({
    id: vehicleId,
    companyId,
    modelId,
    depotStationId: stationA,
    energyUnits: 100_000
  });

  const driver = createTestDriver({
    id: driverId,
    companyId,
    stationId: stationA,
    qualifiedVehicleClasses: ["county_midibus"]
  });

  const routes = new Map<RouteId, PassengerRoute>([
    [route.id, route]
  ]);
  const plans = new Map<ServicePlanId, ServicePlan>([
    [servicePlan.id, servicePlan]
  ]);
  const vehicles = new Map<VehicleId, OwnedVehicle>([
    [vehicle.id, vehicle]
  ]);
  const drivers = new Map<StaffId, Driver>([
    [driver.id, driver]
  ]);
  const trips = new Map<TripId, TripInstance>();
  const models = new Map<VehicleModelId, VehicleModel>([
    [model.id, model]
  ]);
  const worldRuntime = new WorldRuntimeState();
  const operationsSchedules =
    createTestOperationsScheduleRepository();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => id === company.id ? company : undefined,
      save: () => undefined
    },
    finance: createTestFinanceRepository(),
    fleetTasks: createTestFleetTaskRepository(),
    operationsSchedules,
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => new PassengerRuntimeState(),
      replace: () => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: (owner, code) =>
        [...routes.values()].find(
          (value) =>
            value.companyId === owner &&
            value.code === code
        ),
      findActive: () =>
        [...routes.values()].filter(
          (value) => value.status === "active"
        ),
      save: (value) => routes.set(value.id, value)
    },
    servicePlans: {
      getById: (id) => plans.get(id),
      findByRoute: (id) =>
        [...plans.values()].filter(
          (value) => value.routeId === id
        ),
      save: (value) => plans.set(value.id, value)
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      findDriversByCompany: (owner) =>
        [...drivers.values()].filter(
          (value) => value.companyId === owner
        ),
      saveDriver: (value) => drivers.set(value.id, value)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: (servicePlanId, departure) =>
        [...trips.values()].find(
          (trip) =>
            trip.servicePlanId === servicePlanId &&
            trip.plannedDepartureGameSecond === departure
        ),
      findByVehicle: (id) =>
        [...trips.values()].filter(
          (trip) => trip.vehicleId === id
        ),
      findByDriver: (id) =>
        [...trips.values()].filter(
          (trip) => trip.driverId === id
        ),
      findRunning: () =>
        [...trips.values()].filter(
          (trip) => trip.status === "running"
        ),
      save: (trip) => trips.set(trip.id, trip)
    },
    vehicleModels: {
      getById: (id) => models.get(id)
    },
    vehicles: {
      getById: (id) => vehicles.get(id),
      findByCompany: (owner) =>
        [...vehicles.values()].filter(
          (value) => value.companyId === owner
        ),
      save: (value) => vehicles.set(value.id, value)
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graph,
      replace: () => undefined
    },
    worldRuntime: {
      get: () => worldRuntime,
      replace: () => undefined
    }
  };

  let tripSequence = 0;
  let fleetSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000002"),
    nextServicePlanId: () =>
      ids.servicePlan("service_plan.00000002"),
    nextTripId: () => {
      tripSequence += 1;
      return ids.trip(
        `trip.${String(tripSequence).padStart(12, "0")}`
      );
    },
    nextFleetTaskId: () => {
      fleetSequence += 1;
      return ids.fleetTask(
        `fleet_task.${String(fleetSequence).padStart(8, "0")}`
      );
    },
    nextVehicleId: () => ids.vehicle("vehicle.00000002")
  };

  const app = createApplication({
    repositories,
    ids: allocator,
    passengerDemandPolicy: {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    economicPolicy: zeroEconomicPolicy,
    vehicleLifecyclePolicy: zeroVehicleLifecyclePolicy,
    operationsPolicy: {
      vehicleTurnaroundSeconds: () => 60,
      driverTurnaroundSeconds: () => 60,
      passengerBoardingLeadSeconds: () => 120,
      minimumDriverRestSeconds: () => 0,
      maximumContinuousDrivingSeconds: () => 14_400,
      maximumDutySeconds: () => 36_000,
      refuelServiceSeconds: () => 60,
      maintenanceServiceSeconds: () => 180,
      recoveryServiceSeconds: () => 60
    }
  });

  return {
    app,
    repositories,
    companyId,
    planId,
    vehicleId,
    driverId,
    stationA,
    stationB
  };
}

test("committed day plan automatically boards, departs and completes without UI commands", () => {
  const f = simpleFixture();

  const committed = f.app.commands.dispatch(
    command(
      1,
      "operations.commitDayPlan",
      f.companyId,
      0,
      {
        companyId: f.companyId,
        gameDay: 1,
        allowPartial: false
      }
    )
  );
  assert.equal(committed.ok, true);

  const trip =
    f.repositories.trips.findByServicePlanAndDeparture(
      f.planId,
      units.gameSecond(1000)
    );
  assert.ok(trip);
  if (!trip) return;

  assert.equal(trip.status, "planned");
  assert.equal(trip.vehicleId, f.vehicleId);
  assert.equal(trip.driverId, f.driverId);

  f.app.simulation.advanceTo(units.gameSecond(879));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "planned"
  );

  f.app.simulation.advanceTo(units.gameSecond(880));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "boarding"
  );

  f.app.simulation.advanceTo(units.gameSecond(1000));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "running"
  );
  assert.equal(
    Number(
      f.repositories.trips.getById(trip.id)
        ?.actualDepartureGameSecond
    ),
    1000
  );

  f.app.simulation.advanceTo(units.gameSecond(1100));

  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "completed"
  );
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.currentStationId,
    f.stationB
  );

  const schedule =
    f.repositories.operationsSchedules.getByCompanyAndDay(
      f.companyId,
      1
    );
  assert.equal(schedule?.status, "completed");
  assert.equal(schedule?.actions[0]?.status, "completed");
});

test("automatic executor starts planned refuel before boarding", () => {
  const f = simpleFixture();
  const vehicle = f.repositories.vehicles.getById(f.vehicleId);
  assert.ok(vehicle);
  if (!vehicle) return;

  f.repositories.vehicles.save({
    ...vehicle,
    energyUnits: 5_000
  });

  const committed = f.app.commands.dispatch(
    command(
      1,
      "operations.commitDayPlan",
      f.companyId,
      0,
      {
        companyId: f.companyId,
        gameDay: 1,
        allowPartial: false
      }
    )
  );
  assert.equal(committed.ok, true);

  const schedule =
    f.repositories.operationsSchedules.getByCompanyAndDay(
      f.companyId,
      1
    );
  const refuel = schedule?.actions.find(
    (action) => action.kind === "refuel"
  );
  assert.ok(refuel);

  f.app.simulation.advanceTo(units.gameSecond(0));
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.status,
    "refueling"
  );

  f.app.simulation.advanceTo(
    refuel?.endsAtGameSecond ?? units.gameSecond(0)
  );

  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.status,
    "available"
  );
  assert.ok(
    (f.repositories.vehicles.getById(f.vehicleId)?.energyUnits ?? 0) >
      5_000
  );
});

function faultFixture() {
  const companyId = ids.company("company.00000011");
  const stationA = ids.station("station.000011");
  const stationC = ids.station("station.000012");
  const stationB = ids.station("station.000013");
  const nodeA = ids.worldNode("location.000011");
  const nodeC = ids.worldNode("location.000012");
  const nodeB = ids.worldNode("location.000013");
  const regionId = ids.region("region.000011");
  const road1 = ids.roadSegment("road.000011");
  const road2 = ids.roadSegment("road.000012");
  const routeId = ids.route("route.00000011");
  const planId = ids.servicePlan("service_plan.00000011");

  const graphResult = WorldGraph.create(
    [
      {
        id: regionId,
        name: "故障测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: {
          minXM: 0,
          minYM: 0,
          maxXM: 2000,
          maxYM: 1000
        },
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
        id: nodeC,
        regionId,
        type: "bus_station",
        name: "C",
        position: { xM: 1000, yM: 0 },
        active: true
      },
      {
        id: nodeB,
        regionId,
        type: "bus_station",
        name: "B",
        position: { xM: 2000, yM: 0 },
        active: true
      }
    ],
    [
      {
        id: road1,
        regionId,
        fromNodeId: nodeA,
        toNodeId: nodeC,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(10),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      },
      {
        id: road2,
        regionId,
        fromNodeId: nodeC,
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
  if (!graphResult.ok) throw graphResult.error;
  const graph = graphResult.value;

  const company: Company = {
    id: companyId,
    name: "故障测试客运",
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
      stationC,
      {
        id: stationC,
        name: "C站",
        worldNodeId: nodeC,
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

  const route: PassengerRoute = {
    id: routeId,
    companyId,
    code: "A-C-B",
    type: "county",
    stopPoints: [
      { stationId: stationA, pathLegBoundaryIndex: 0 },
      { stationId: stationC, pathLegBoundaryIndex: 1 },
      { stationId: stationB, pathLegBoundaryIndex: 2 }
    ],
    pathLegs: [
      {
        roadSegmentId: road1,
        direction: "forward",
        fromNodeId: nodeA,
        toNodeId: nodeC
      },
      {
        roadSegmentId: road2,
        direction: "forward",
        fromNodeId: nodeC,
        toNodeId: nodeB
      }
    ],
    routingPreference: "fastest_time",
    farePolicyId: ids.farePolicy("fare_policy.000011"),
    requiredLicenseIds: [],
    status: "active"
  };

  const plan: ServicePlan = {
    id: planId,
    routeId,
    effectiveFromGameSecond: units.gameSecond(0),
    effectiveUntilGameSecond: null,
    calendar: { serviceDays: ["monday"] },
    departurePattern: {
      kind: "fixed_times",
      secondOfDay: [1000]
    },
    requiredVehicleClass: "county_midibus",
    status: "active"
  };

  const failingModel = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000011"),
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20),
    tireWearPermillePer1000Km: 1_250_000,
    minimumTireConditionPermille: 600
  });

  const spareModel = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000012"),
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20),
    tireWearPermillePer1000Km: 1
  });

  const activeVehicle = createTestOwnedVehicle({
    id: ids.vehicle("vehicle.00000011"),
    companyId,
    modelId: failingModel.id,
    depotStationId: stationA,
    energyUnits: 100_000
  });

  const spareVehicle = createTestOwnedVehicle({
    id: ids.vehicle("vehicle.00000012"),
    companyId,
    modelId: spareModel.id,
    depotStationId: stationC,
    energyUnits: 100_000
  });

  const driver = createTestDriver({
    id: ids.staff("staff.00000011"),
    companyId,
    stationId: stationA,
    qualifiedVehicleClasses: ["county_midibus"]
  });

  const trips = new Map<TripId, TripInstance>();
  const vehicles = new Map<VehicleId, OwnedVehicle>([
    [activeVehicle.id, activeVehicle],
    [spareVehicle.id, spareVehicle]
  ]);
  const drivers = new Map<StaffId, Driver>([
    [driver.id, driver]
  ]);
  const models = new Map<VehicleModelId, VehicleModel>([
    [failingModel.id, failingModel],
    [spareModel.id, spareModel]
  ]);
  const operationsSchedules =
    createTestOperationsScheduleRepository();
  const fleetTasks = createTestFleetTaskRepository();
  const worldRuntime = new WorldRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => id === companyId ? company : undefined,
      save: () => undefined
    },
    finance: createTestFinanceRepository(),
    fleetTasks,
    operationsSchedules,
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => new PassengerRuntimeState(),
      replace: () => undefined
    },
    routes: {
      getById: (id) => id === route.id ? route : undefined,
      findByCompanyAndCode: () => route,
      findActive: () => [route],
      save: () => undefined
    },
    servicePlans: {
      getById: (id) => id === plan.id ? plan : undefined,
      findByRoute: (id) => id === route.id ? [plan] : [],
      save: () => undefined
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      findDriversByCompany: (owner) =>
        [...drivers.values()].filter(
          (value) => value.companyId === owner
        ),
      saveDriver: (value) => drivers.set(value.id, value)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: (servicePlanId, departure) =>
        [...trips.values()].find(
          (trip) =>
            trip.servicePlanId === servicePlanId &&
            trip.plannedDepartureGameSecond === departure
        ),
      findByVehicle: (id) =>
        [...trips.values()].filter(
          (trip) => trip.vehicleId === id
        ),
      findByDriver: (id) =>
        [...trips.values()].filter(
          (trip) => trip.driverId === id
        ),
      findRunning: () =>
        [...trips.values()].filter(
          (trip) => trip.status === "running"
        ),
      save: (trip) => trips.set(trip.id, trip)
    },
    vehicleModels: {
      getById: (id) => models.get(id)
    },
    vehicles: {
      getById: (id) => vehicles.get(id),
      findByCompany: (owner) =>
        [...vehicles.values()].filter(
          (value) => value.companyId === owner
        ),
      save: (value) => vehicles.set(value.id, value)
    },
    vehicleRuntime: createTestVehicleRuntimeRepository(),
    world: {
      get: () => graph,
      replace: () => undefined
    },
    worldRuntime: {
      get: () => worldRuntime,
      replace: () => undefined
    }
  };

  let tripSequence = 0;
  let fleetSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000012"),
    nextServicePlanId: () =>
      ids.servicePlan("service_plan.00000012"),
    nextTripId: () => {
      tripSequence += 1;
      return ids.trip(
        `trip.${String(tripSequence).padStart(12, "0")}`
      );
    },
    nextFleetTaskId: () => {
      fleetSequence += 1;
      return ids.fleetTask(
        `fleet_task.${String(fleetSequence).padStart(8, "0")}`
      );
    },
    nextVehicleId: () => ids.vehicle("vehicle.00000013")
  };

  const app = createApplication({
    repositories,
    ids: allocator,
    passengerDemandPolicy: {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    economicPolicy: zeroEconomicPolicy,
    vehicleLifecyclePolicy: zeroVehicleLifecyclePolicy,
    operationsPolicy: {
      vehicleTurnaroundSeconds: () => 0,
      driverTurnaroundSeconds: () => 0,
      passengerBoardingLeadSeconds: () => 0,
      minimumDriverRestSeconds: () => 0,
      maximumContinuousDrivingSeconds: () => 14_400,
      maximumDutySeconds: () => 36_000,
      refuelServiceSeconds: () => 60,
      maintenanceServiceSeconds: () => 180,
      recoveryServiceSeconds: () => 60
    }
  });

  return {
    app,
    repositories,
    companyId,
    planId,
    activeVehicleId: activeVehicle.id,
    spareVehicleId: spareVehicle.id,
    stationC
  };
}

test("breakdown triggers recovery, spare vehicle substitution and schedule revision", () => {
  const f = faultFixture();

  const committed = f.app.commands.dispatch(
    command(
      1,
      "operations.commitDayPlan",
      f.companyId,
      0,
      {
        companyId: f.companyId,
        gameDay: 1,
        allowPartial: false
      }
    )
  );
  assert.equal(committed.ok, true);

  const trip =
    f.repositories.trips.findByServicePlanAndDeparture(
      f.planId,
      units.gameSecond(1000)
    );
  assert.ok(trip);
  if (!trip) return;

  assert.equal(trip.vehicleId, f.activeVehicleId);

  f.app.simulation.advanceTo(units.gameSecond(1000));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "running"
  );

  f.app.simulation.advanceTo(units.gameSecond(1081));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "disrupted"
  );
  assert.equal(
    f.repositories.vehicles.getById(f.activeVehicleId)?.status,
    "recovering"
  );

  f.app.simulation.advanceTo(units.gameSecond(1141));

  const resumed = f.repositories.trips.getById(trip.id);
  assert.equal(resumed?.status, "running");
  assert.equal(resumed?.vehicleId, f.spareVehicleId);
  assert.equal(resumed?.recoveryStationId, null);

  const schedule =
    f.repositories.operationsSchedules.getByCompanyAndDay(
      f.companyId,
      1
    );
  assert.ok((schedule?.revision ?? 0) >= 2);
  assert.equal(
    f.repositories.vehicles.getById(f.activeVehicleId)?.currentStationId,
    f.stationC
  );

  f.app.simulation.advanceTo(units.gameSecond(1241));
  assert.equal(
    f.repositories.trips.getById(trip.id)?.status,
    "completed"
  );
});


test("dispatch center read model exposes committed trips, fleet, drivers and live status", async () => {
  const f = simpleFixture();

  const committed = f.app.commands.dispatch(
    command(
      21,
      "operations.commitDayPlan",
      f.companyId,
      0,
      {
        companyId: f.companyId,
        gameDay: 1,
        allowPartial: false
      }
    )
  );
  assert.equal(committed.ok, true);

  const initial = await f.app.queries.execute({
    type: "operations.dispatchCenter",
    payload: {
      companyId: f.companyId,
      gameDay: 1,
      currentGameSecond: units.gameSecond(0)
    }
  });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;

  const snapshot = initial.value as {
    readonly schedule: {
      readonly committed: boolean;
      readonly revision: number | null;
    };
    readonly summary: {
      readonly passengerTripsTotal: number;
      readonly passengerTripsPlanned: number;
      readonly fleetTotal: number;
      readonly driversTotal: number;
      readonly shortageTrips: number;
    };
    readonly trips: readonly {
      readonly routeCode: string;
      readonly boardingStartGameSecond: number;
      readonly tripStatus: string;
    }[];
    readonly vehicles: readonly {
      readonly vehicleId: VehicleId;
      readonly nextOperationKind: string | null;
      readonly nextOperationGameSecond: number | null;
    }[];
    readonly drivers: readonly {
      readonly driverId: StaffId;
      readonly nextOperationKind: string | null;
    }[];
  };

  assert.equal(snapshot.schedule.committed, true);
  assert.equal(snapshot.schedule.revision, 1);
  assert.equal(snapshot.summary.passengerTripsTotal, 1);
  assert.equal(snapshot.summary.passengerTripsPlanned, 1);
  assert.equal(snapshot.summary.fleetTotal, 1);
  assert.equal(snapshot.summary.driversTotal, 1);
  assert.equal(snapshot.summary.shortageTrips, 0);
  assert.equal(snapshot.trips[0]?.routeCode, "A-B");
  assert.equal(
    snapshot.trips[0]?.boardingStartGameSecond,
    880
  );
  assert.equal(snapshot.trips[0]?.tripStatus, "planned");
  assert.equal(snapshot.vehicles[0]?.vehicleId, f.vehicleId);
  assert.equal(
    snapshot.vehicles[0]?.nextOperationKind,
    "passenger_trip"
  );
  assert.equal(
    snapshot.vehicles[0]?.nextOperationGameSecond,
    880
  );
  assert.equal(snapshot.drivers[0]?.driverId, f.driverId);
  assert.equal(
    snapshot.drivers[0]?.nextOperationKind,
    "passenger_trip"
  );

  f.app.simulation.advanceTo(units.gameSecond(1000));

  const running = await f.app.queries.execute({
    type: "operations.dispatchCenter",
    payload: {
      companyId: f.companyId,
      gameDay: 1,
      currentGameSecond: units.gameSecond(1000)
    }
  });
  assert.equal(running.ok, true);
  if (!running.ok) return;

  const runningSnapshot = running.value as {
    readonly summary: {
      readonly passengerTripsRunning: number;
      readonly fleetRunning: number;
      readonly driversDriving: number;
    };
    readonly trips: readonly {
      readonly actualDepartureGameSecond: number | null;
      readonly tripStatus: string;
    }[];
  };

  assert.equal(runningSnapshot.summary.passengerTripsRunning, 1);
  assert.equal(runningSnapshot.summary.fleetRunning, 1);
  assert.equal(runningSnapshot.summary.driversDriving, 1);
  assert.equal(
    runningSnapshot.trips[0]?.actualDepartureGameSecond,
    1000
  );
  assert.equal(runningSnapshot.trips[0]?.tripStatus, "running");
});

test("dispatch center exposes automatic support actions and energy state", async () => {
  const f = simpleFixture();
  const vehicle = f.repositories.vehicles.getById(f.vehicleId);
  assert.ok(vehicle);
  if (!vehicle) return;

  f.repositories.vehicles.save({
    ...vehicle,
    energyUnits: 5_000
  });

  const committed = f.app.commands.dispatch(
    command(
      22,
      "operations.commitDayPlan",
      f.companyId,
      0,
      {
        companyId: f.companyId,
        gameDay: 1,
        allowPartial: false
      }
    )
  );
  assert.equal(committed.ok, true);

  const result = await f.app.queries.execute({
    type: "operations.dispatchCenter",
    payload: {
      companyId: f.companyId,
      gameDay: 1,
      currentGameSecond: units.gameSecond(0)
    }
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const snapshot = result.value as {
    readonly summary: {
      readonly supportActionsTotal: number;
    };
    readonly support: readonly {
      readonly kind: string;
      readonly status: string;
      readonly energyUnits: number;
    }[];
    readonly vehicles: readonly {
      readonly energyUnits: number;
      readonly energyPermille: number;
      readonly nextOperationKind: string | null;
    }[];
  };

  assert.ok(snapshot.summary.supportActionsTotal >= 1);
  const refuel = snapshot.support.find(
    (action) => action.kind === "refuel"
  );
  assert.ok(refuel);
  assert.equal(refuel?.status, "planned");
  assert.ok((refuel?.energyUnits ?? 0) > 0);
  assert.equal(snapshot.vehicles[0]?.energyUnits, 5_000);
  assert.equal(
    snapshot.vehicles[0]?.nextOperationKind,
    "refuel"
  );
});
