import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type VehicleId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import { accountBalanceCents } from "../../src/domain/finance/LedgerMath.js";
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import { createTestFinanceRepository } from "../helpers/TestFinance.js";
import {
  createTestVehicleModel,
  createTestVehicleRuntimeRepository
} from "../helpers/TestVehicle.js";
import {
  createTestFleetTaskRepository,
  zeroOperationsPolicy
} from "../helpers/TestOperations.js";

function fixture() {
  const companyId = ids.company("company.00000001");
  const stationId = ids.station("station.000001");
  const model = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    energyCapacityUnits: 100_000,
    minimumDispatchEnergyUnits: 5_000
  });

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: stationId
  };

  const regionId = ids.region("region.000001");
  const nodeId = ids.worldNode("location.000001");
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
        id: nodeId,
        regionId,
        type: "bus_station",
        name: "总站",
        position: { xM: 0, yM: 0 },
        active: true
      }
    ],
    []
  );
  if (!graph.ok) throw graph.error;

  const finance = createTestFinanceRepository({
    companyProfiles: [
      {
        companyId,
        openingCapitalCents: units.moneyCents(200_000),
        dailyOverheadCents: units.moneyCents(0)
      }
    ]
  });

  const vehicles = new Map<VehicleId, OwnedVehicle>();
  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => id === companyId ? company : undefined,
      save: () => undefined
    },
    finance,
    fleetTasks: createTestFleetTaskRepository(),
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
      getDriverById: () => undefined,
      findDriversByCompany: () => [],
      saveDriver: () => undefined
    },
    stations: {
      getById: (id) =>
        id === stationId
          ? {
              id: stationId,
              name: "总站",
              worldNodeId: nodeId,
              ownerCompanyId: companyId,
              status: "active"
            }
          : undefined
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
      get: () => new WorldRuntimeState(),
      replace: () => undefined
    }
  };

  let vehicleSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000001"),
    nextServicePlanId: () => ids.servicePlan("service_plan.00000001"),
    nextTripId: () => ids.trip("trip.000000000001"),
    nextFleetTaskId: () => ids.fleetTask("fleet_task.00000001"),
    nextVehicleId: () => {
      vehicleSequence += 1;
      return ids.vehicle(
        `vehicle.${String(vehicleSequence).padStart(8, "0")}`
      );
    }
  };

  const app = createApplication({
    repositories,
    ids: allocator,
    passengerDemandPolicy: {
      frequencyMultiplierPermille: () => units.permille(1000)
    },
    economicPolicy: {
      energyPriceMilliCentsPerUnit: () => 1000,
      roadTollMilliCentsPerKm: () => 0,
      ticketTaxCents: () => units.moneyCents(0),
      stationDepartureFeeCents: () => units.moneyCents(0),
      stationArrivalFeeCents: () => units.moneyCents(0),
      stationPassengerServiceFeeCents: () => units.moneyCents(0),
      companyDailyRegulatoryFeeCents: () => units.moneyCents(0)
    },
    vehicleLifecyclePolicy: {
      quotePurchase: () => ({
        purchasePriceCents: units.moneyCents(100_000),
        residualValueCents: units.moneyCents(20_000),
        usefulLifeDays: 3650,
        initialInsuranceValidDays: 365,
        initialInspectionValidDays: 365,
        dailyInsuranceCents: units.moneyCents(0),
        dailyVehicleTaxCents: units.moneyCents(0)
      }),
      quoteMaintenance: () => units.moneyCents(5_000),
      quoteInsuranceRenewal: () => ({
        costCents: units.moneyCents(1_000),
        validForDays: 365
      }),
      quoteInspection: () => ({
        costCents: units.moneyCents(500),
        validForDays: 365
      }),
      quoteResale: () => units.moneyCents(70_000),
      quoteScrap: () => units.moneyCents(10_000)
    },
    operationsPolicy: zeroOperationsPolicy
  });

  return { app, repositories, companyId, stationId, model, vehicles };
}

function command<T>(
  sequence: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(
      `command.${String(sequence).padStart(8, "0")}`
    ),
    type,
    issuedAtGameSecond: units.gameSecond(sequence * 100),
    actorCompanyId: companyId,
    payload
  };
}

test("purchase, timed refuel, timed maintenance and sale form one audited lifecycle", async () => {
  const f = fixture();

  const purchased = await f.app.commands.dispatch(
    command(1, "vehicle.purchase", f.companyId, {
      companyId: f.companyId,
      vehicleModelId: f.model.id,
      depotStationId: f.stationId
    })
  );
  assert.equal(purchased.ok, true);
  if (!purchased.ok) return;

  const vehicle = purchased.value as OwnedVehicle;
  assert.equal(vehicle.energyUnits, 0);
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "cash"
    ),
    100_000
  );

  const fueled = await f.app.commands.dispatch(
    command(2, "vehicle.refuel", f.companyId, {
      vehicleId: vehicle.id,
      energyUnits: 20_000
    })
  );
  assert.equal(fueled.ok, true);
  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.status,
    "refueling"
  );

  f.app.simulation.advanceTo(units.gameSecond(200));

  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.energyUnits,
    20_000
  );
  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.status,
    "available"
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "energy_inventory"
    ),
    20_000
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "cash"
    ),
    80_000
  );

  const sent = await f.app.commands.dispatch(
    command(3, "vehicle.sendToMaintenance", f.companyId, {
      vehicleId: vehicle.id
    })
  );
  assert.equal(sent.ok, true);
  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.status,
    "maintenance"
  );

  f.app.simulation.advanceTo(units.gameSecond(300));

  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.status,
    "available"
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "accounts_payable"
    ),
    0
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "cash"
    ),
    75_000
  );

  const sold = await f.app.commands.dispatch(
    command(5, "vehicle.sell", f.companyId, {
      vehicleId: vehicle.id
    })
  );
  assert.equal(sold.ok, true);
  assert.equal(
    f.repositories.vehicles.getById(vehicle.id)?.status,
    "sold"
  );
  assert.equal(
    f.repositories.finance.getVehicleAssetProfile(vehicle.id),
    undefined
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "vehicle_asset"
    ),
    0
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "energy_inventory"
    ),
    0
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "loss_on_vehicle_disposal"
    ),
    50_000
  );
  assert.equal(
    accountBalanceCents(
      f.repositories.finance.ledgerEntriesByCompany(f.companyId),
      "cash"
    ),
    145_000
  );
});
