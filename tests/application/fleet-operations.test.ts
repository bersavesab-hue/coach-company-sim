import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type FleetTaskId,
  type StaffId,
  type StationId,
  type VehicleId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { Driver } from "../../src/domain/staff/Driver.js";
import type { Station } from "../../src/domain/station/Station.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import { createTestFinanceRepository, zeroEconomicPolicy } from "../helpers/TestFinance.js";
import { createTestFleetTaskRepository } from "../helpers/TestOperations.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository,
  zeroVehicleLifecyclePolicy
} from "../helpers/TestVehicle.js";

function fixture(
  vehicleEnergyUnits = 100_000,
  driverOverrides: Partial<Driver> = {}
) {
  const companyId = ids.company("company.00000001");
  const vehicleId = ids.vehicle("vehicle.00000001");
  const driverId = ids.staff("staff.00000001");
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

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: stationA
  };

  const stationMap = new Map<StationId, Station>([
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

  const model = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    maxSpeedMps: units.speedMps(20),
    drivingEnergyUnitsPer100Km: 20_000,
    minimumDispatchEnergyUnits: 5_000
  });

  const vehicle = createTestOwnedVehicle({
    id: vehicleId,
    companyId,
    modelId: model.id,
    depotStationId: stationA,
    energyUnits: vehicleEnergyUnits
  });

  const driver = {
    ...createTestDriver({
      id: driverId,
      companyId,
      stationId: stationA,
      qualifiedVehicleClasses: ["county_midibus"]
    }),
    ...driverOverrides
  };

  const vehicles = new Map<VehicleId, OwnedVehicle>([[vehicleId, vehicle]]);
  const drivers = new Map<StaffId, Driver>([[driverId, driver]]);
  const fleetTasks = createTestFleetTaskRepository();
  const worldRuntime = new WorldRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => id === companyId ? company : undefined,
      save: () => undefined
    },
    finance: createTestFinanceRepository(),
    fleetTasks,
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => new PassengerRuntimeState(),
      replace: () => undefined
    },
    routes: {
      getById: () => undefined,
      findByCompanyAndCode: () => undefined,
      findActive: () => [],
      save: () => undefined
    },
    servicePlans: {
      getById: () => undefined,
      findByRoute: () => [],
      save: () => undefined
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
      getById: (id) => stationMap.get(id)
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
      get: () => worldRuntime,
      replace: () => undefined
    }
  };

  let fleetSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000001"),
    nextServicePlanId: () => ids.servicePlan("service_plan.00000001"),
    nextTripId: () => ids.trip("trip.000000000001"),
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
      minimumDriverRestSeconds: () => 3600,
      maximumContinuousDrivingSeconds: () => 14_400,
      maximumDutySeconds: () => 36_000,
      refuelServiceSeconds: () => 600,
      maintenanceServiceSeconds: () => 1800,
      recoveryServiceSeconds: () => 1200
    }
  });

  return {
    app,
    repositories,
    companyId,
    vehicleId,
    driverId,
    stationA,
    stationB,
    fleetTasks
  };
}

function command<T>(
  sequence: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  issuedAt: number,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(
      `command.${String(sequence).padStart(8, "0")}`
    ),
    type,
    issuedAtGameSecond: units.gameSecond(issuedAt),
    actorCompanyId: companyId,
    payload
  };
}

test("deadhead reposition occupies time and consumes real mileage and energy", async () => {
  const f = fixture();

  const result = await f.app.commands.dispatch(
    command(1, "fleet.reposition", f.companyId, 0, {
      vehicleId: f.vehicleId,
      driverId: f.driverId,
      toStationId: f.stationB
    })
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const task = result.value as {
    readonly id: FleetTaskId;
    readonly completesAtGameSecond: ReturnType<typeof units.gameSecond>;
  };

  assert.equal(Number(task.completesAtGameSecond), 100);
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.status,
    "repositioning"
  );
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.currentStationId,
    null
  );

  f.app.simulation.advanceTo(units.gameSecond(99));
  assert.equal(
    f.repositories.vehicles.getById(f.vehicleId)?.currentStationId,
    null
  );

  f.app.simulation.advanceTo(units.gameSecond(100));

  const vehicle = f.repositories.vehicles.getById(f.vehicleId);
  const driver = f.repositories.staff.getDriverById(f.driverId);

  assert.equal(vehicle?.status, "available");
  assert.equal(vehicle?.currentStationId, f.stationB);
  assert.equal(Number(vehicle?.mileageM), 1000);
  assert.equal(vehicle?.energyUnits, 99_800);
  assert.equal(driver?.currentStationId, f.stationB);
  assert.equal(driver?.continuousDrivingSeconds, 100);
  assert.equal(
    f.fleetTasks.getById(task.id)?.status,
    "completed"
  );
});

test("deadhead reposition is rejected when energy reserve is insufficient", async () => {
  const f = fixture(5_100);

  const result = await f.app.commands.dispatch(
    command(1, "fleet.reposition", f.companyId, 0, {
      vehicleId: f.vehicleId,
      driverId: f.driverId,
      toStationId: f.stationB
    })
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "VEHICLE_ENERGY_INSUFFICIENT");
  }
});

test("deadhead reposition enforces continuous driver rest limits", async () => {
  const f = fixture(100_000, {
    dutyStartedAtGameSecond: units.gameSecond(0),
    lastDutyEndedAtGameSecond: units.gameSecond(0),
    continuousDrivingSeconds: 14_350
  });

  const result = await f.app.commands.dispatch(
    command(1, "fleet.reposition", f.companyId, 1000, {
      vehicleId: f.vehicleId,
      driverId: f.driverId,
      toStationId: f.stationB
    })
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "DRIVER_REST_REQUIRED");
  }
});
