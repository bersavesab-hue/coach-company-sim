import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import type { FarePolicy } from "../../src/domain/finance/FarePolicy.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { Driver } from "../../src/domain/staff/Driver.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import { DomainEventBus } from "../../src/application/events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../../src/application/events/createSimulationDomainEvent.js";
import { FinanceCoordinator } from "../../src/application/finance/FinanceCoordinator.js";
import { VehicleLifecycleCoordinator } from "../../src/application/vehicle/VehicleLifecycleCoordinator.js";
import { registerFinanceQueries } from "../../src/application/handlers/finance/registerFinanceQueries.js";
import { QueryBus } from "../../src/application/QueryBus.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { createTestFinanceRepository } from "../helpers/TestFinance.js";
import { createTestDriver } from "../helpers/TestDriver.js";
import { createTestFleetTaskRepository } from "../helpers/TestOperations.js";
import {
  createTestOwnedVehicle,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository
} from "../helpers/TestVehicle.js";

function fixture() {
  const companyId = ids.company("company.00000001");
  const routeId = ids.route("route.00000001");
  const tripId = ids.trip("trip.000000000001");
  const vehicleId = ids.vehicle("vehicle.00000001");
  const modelId = ids.vehicleModel("vehicle_model.000001");
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
        bounds: { minXM: 0, minYM: 0, maxXM: 100000, maxYM: 1000 },
        active: true
      }
    ],
    [
      { id: nodeA, regionId, type: "bus_station", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: nodeB, regionId, type: "bus_station", name: "B", position: { xM: 100000, yM: 0 }, active: true }
    ],
    [
      {
        id: roadId,
        regionId,
        fromNodeId: nodeA,
        toNodeId: nodeB,
        lengthM: units.distanceM(100000),
        speedLimitMps: units.speedMps(20),
        roadClass: "expressway",
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

  const route: PassengerRoute = {
    id: routeId,
    companyId,
    code: "K01",
    type: "intercity",
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

  const farePolicy: FarePolicy = {
    id: route.farePolicyId,
    baseFareCents: units.moneyCents(500),
    perKmCents: units.moneyCents(50),
    minimumFareCents: units.moneyCents(500),
    maximumFareCents: null,
    roundingIncrementCents: 100,
    roundingMode: "nearest",
    pairOverrides: []
  };

  const vehicle: OwnedVehicle = createTestOwnedVehicle({
    id: vehicleId,
    companyId,
    modelId,
    status: "running",
    activeTripId: tripId,
    depotStationId: stationA,
    energyUnits: 100_000
  });

  const model: VehicleModel = createTestVehicleModel({
    id: modelId,
    serviceClass: "intercity_coach",
    seatCapacity: 50,
    maxSpeedMps: units.speedMps(30),
    energyKind: "diesel_ml",
    drivingEnergyUnitsPer100Km: 20_000,
    idleEnergyUnitsPerHour: 2_000
  });

  const driver: Driver = createTestDriver({
    id: driverId,
    companyId,
    stationId: stationA,
    status: "driving",
    activeTripId: tripId,
    qualifiedVehicleClasses: ["intercity_coach"]
  });

  const trip: TripInstance = {
    id: tripId,
    routeId,
    servicePlanId: ids.servicePlan("service_plan.00000001"),
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
      { destinationStationId: stationB, count: 10 }
    ],
    recoveryStationId: null,
    delaySeconds: units.gameSecond(0)
  };

  const finance = createTestFinanceRepository({
    farePolicies: [farePolicy],
    companyProfiles: [
      {
        companyId,
        openingCapitalCents: units.moneyCents(100000),
        dailyOverheadCents: units.moneyCents(1000)
      }
    ],
    vehicleEconomicProfiles: [
      {
        vehicleModelId: modelId,
        maintenanceEconomicCostCentsPerKm: units.moneyCents(30),
        economicDepreciationCentsPerKm: units.moneyCents(20)
      }
    ],
    vehicleAssetProfiles: [
      {
        vehicleId,
        companyId,
        acquisitionCostCents: units.moneyCents(100000),
        residualValueCents: units.moneyCents(0),
        usefulLifeDays: 100,
        acquiredGameSecond: units.gameSecond(0),
        dailyInsuranceCents: units.moneyCents(100),
        dailyVehicleTaxCents: units.moneyCents(50)
      }
    ],
    driverProfiles: [
      {
        staffId: driverId,
        companyId,
        baseDailyWageCents: units.moneyCents(10000),
        drivingAllowanceCentsPerHour: units.moneyCents(3000),
        employerBurdenPermille: units.permille(200)
      }
    ],
    stationProfiles: [
      {
        stationId: stationA,
        companyId,
        dailyLeaseCents: units.moneyCents(500)
      }
    ]
  });

  const companies = new Map([[companyId, company]]);
  const routes = new Map([[routeId, route]]);
  const trips = new Map([[tripId, trip]]);
  const vehicles = new Map([[vehicleId, vehicle]]);
  const models = new Map([[modelId, model]]);
  const drivers = new Map([[driverId, driver]]);
  const worldRuntime = new WorldRuntimeState();

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => companies.get(id),
      save: (value) => companies.set(value.id, value)
    },
    finance,
    fleetTasks: createTestFleetTaskRepository(),
    passengerDemand: { all: () => [] },
    passengerRuntime: {
      get: () => { throw new Error("not used"); },
      replace: () => undefined
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: () => undefined,
      findActive: () => [...routes.values()],
      save: (value) => routes.set(value.id, value)
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
    stations: { getById: () => undefined },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: () => undefined,
      findByVehicle: (vehicleId) =>
        [...trips.values()].filter((value) => value.vehicleId === vehicleId),
      findByDriver: (driverId) =>
        [...trips.values()].filter((value) => value.driverId === driverId),
      findRunning: () => [...trips.values()],
      save: (value) => trips.set(value.id, value)
    },
    vehicleModels: { getById: (id) => models.get(id) },
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

  const events = new DomainEventBus();
  const economicPolicy = {
    energyPriceMilliCentsPerUnit: () => 750,
    roadTollMilliCentsPerKm: () => 50000,
    ticketTaxCents: (gross: ReturnType<typeof units.moneyCents>) =>
      units.moneyCents(Math.floor(Number(gross) * 5 / 100)),
    stationDepartureFeeCents: () => units.moneyCents(200),
    stationArrivalFeeCents: () => units.moneyCents(200),
    stationPassengerServiceFeeCents: () => units.moneyCents(100),
    companyDailyRegulatoryFeeCents: () => units.moneyCents(0)
  };

  const coordinator = new FinanceCoordinator(
    repositories,
    events,
    economicPolicy
  );
  coordinator.initialize();

  const lifecycle = new VehicleLifecycleCoordinator(
    repositories,
    events
  );
  void lifecycle;

  return {
    companyId,
    routeId,
    tripId,
    vehicleId,
    driverId,
    stationA,
    stationB,
    roadId,
    repositories,
    events,
    coordinator
  };
}

test("trip accounting posts ticket, energy, toll, labor and management costs", async () => {
  const f = fixture();

  f.events.publish(
    createSimulationDomainEvent(
      "vehicle.energyPurchased",
      "vehicle",
      f.vehicleId,
      units.gameSecond(0),
      {
        vehicleId: f.vehicleId,
        companyId: f.companyId,
        energyKind: "diesel_ml",
        energyUnits: 20_000,
        totalCostCents: units.moneyCents(15_000)
      }
    )
  );

  f.events.publish(
    createSimulationDomainEvent(
      "passengers.boarded",
      "trip",
      f.tripId,
      units.gameSecond(0),
      {
        tripId: f.tripId,
        stationId: f.stationA,
        count: 10,
        boardedGroups: [
          { destinationStationId: f.stationB, count: 10 }
        ]
      }
    )
  );

  f.events.publish(
    createSimulationDomainEvent(
      "trip.departed",
      "trip",
      f.tripId,
      units.gameSecond(1),
      { tripId: f.tripId }
    )
  );

  f.events.publish(
    createSimulationDomainEvent(
      "trip.operatingInterval",
      "trip",
      f.tripId,
      units.gameSecond(5000),
      {
        tripId: f.tripId,
        vehicleId: f.vehicleId,
        driverId: f.driverId,
        movingSeconds: 5000,
        idleSeconds: 0,
        distanceTraveledM: 100000,
        roadUsage: [
          { roadSegmentId: f.roadId, distanceM: 100000 }
        ]
      }
    )
  );

  f.events.publish(
    createSimulationDomainEvent(
      "trip.arrivedAtStop",
      "trip",
      f.tripId,
      units.gameSecond(5000),
      { tripId: f.tripId, stationId: f.stationB }
    )
  );

  const queryBus = new QueryBus();
  registerFinanceQueries(queryBus, f.repositories);

  const result = await queryBus.execute({
    type: "finance.tripEconomics",
    payload: { tripId: f.tripId }
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const dto = result.value as {
    grossTicketSalesCents: number;
    netPassengerRevenueCents: number;
    ticketTaxCents: number;
    accountingVariableCostCents: number;
    maintenanceEconomicCostCents: number;
    economicDepreciationCents: number;
    contributionProfitCents: number;
  };

  assert.equal(dto.grossTicketSalesCents, 55000);
  assert.equal(dto.netPassengerRevenueCents, 52250);
  assert.equal(dto.ticketTaxCents, 2750);
  assert.equal(dto.maintenanceEconomicCostCents, 3000);
  assert.equal(dto.economicDepreciationCents, 2000);
  assert.ok(dto.accountingVariableCostCents > 20000);
  assert.equal(
    dto.contributionProfitCents,
    dto.netPassengerRevenueCents -
      dto.accountingVariableCostCents -
      3000 -
      2000
  );

  for (const entry of f.repositories.finance.ledgerEntriesByTrip(f.tripId)) {
    const debit = entry.postings
      .filter((posting) => posting.side === "debit")
      .reduce((sum, posting) => sum + Number(posting.amountCents), 0);
    const credit = entry.postings
      .filter((posting) => posting.side === "credit")
      .reduce((sum, posting) => sum + Number(posting.amountCents), 0);
    assert.equal(debit, credit);
  }
});

test("daily accrual separates accounting profit from cash flow", async () => {
  const f = fixture();
  f.coordinator.advanceTo(units.gameSecond(86400));

  const queryBus = new QueryBus();
  registerFinanceQueries(queryBus, f.repositories);

  const result = await queryBus.execute({
    type: "finance.companySnapshot",
    payload: { companyId: f.companyId }
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const dto = result.value as {
    cashBalanceCents: number;
    accountsPayableCents: number;
    payrollPayableCents: number;
    totalExpenseCents: number;
    accountingProfitCents: number;
    capitalInflowCents: number;
  };

  assert.equal(dto.capitalInflowCents, 100000);
  assert.equal(dto.accountsPayableCents, 0);
  assert.equal(dto.payrollPayableCents, 0);
  assert.equal(dto.cashBalanceCents, 86350);
  assert.equal(dto.totalExpenseCents, 14650);
  assert.equal(dto.accountingProfitCents, -14650);
});
