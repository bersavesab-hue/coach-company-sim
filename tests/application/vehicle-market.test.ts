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
import { PassengerRuntimeState } from "../../src/domain/passenger/PassengerRuntimeState.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../src/domain/world/WorldRuntimeState.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import { createTestFinanceRepository } from "../helpers/TestFinance.js";
import {
  createTestFleetTaskRepository,
  createTestOperationsScheduleRepository,
  zeroOperationsPolicy
} from "../helpers/TestOperations.js";
import {
  createTestVehicleMarketRepository,
  createTestVehicleModel,
  createTestVehicleRuntimeRepository,
  zeroVehicleLifecyclePolicy,
  zeroVehicleMarketPolicy
} from "../helpers/TestVehicle.js";

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

function fixture() {
  const companyId = ids.company("company.00000001");
  const stationId = ids.station("station.000001");
  const regionId = ids.region("region.000001");
  const nodeId = ids.worldNode("location.000001");
  const model = createTestVehicleModel({
    id: ids.vehicleModel("vehicle_model.000001"),
    seatCapacity: 30,
    energyCapacityUnits: 100_000
  });

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: stationId
  };

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

  const brandId = ids.vehicleBrand("vehicle_brand.000001");
  const seriesId = ids.vehicleSeries("vehicle_series.000001");
  const variantId = ids.vehicleVariant("vehicle_variant.000001");
  const standardConfigurationId = ids.vehicleConfiguration(
    "vehicle_configuration.standard"
  );
  const dealerId = ids.vehicleDealer("vehicle_dealer.000001");
  const newListingId = ids.vehicleListing("vehicle_listing.000001");
  const usedListingId = ids.vehicleListing("vehicle_listing.000002");

  const vehicleMarket = createTestVehicleMarketRepository({
    brands: [
      {
        id: brandId,
        name: "星河客车",
        originCode: "CN",
        active: true
      }
    ],
    series: [
      {
        id: seriesId,
        brandId,
        name: "远行系列",
        active: true
      }
    ],
    modelIdentities: [
      {
        modelId: model.id,
        seriesId,
        displayName: "远行 10米客车",
        productionStartYear: 2025,
        productionEndYear: null
      }
    ],
    variants: [
      {
        id: variantId,
        modelId: model.id,
        name: "2026 标准版",
        modelYear: 2026,
        basePriceCents: units.moneyCents(120_000),
        standardSeatCapacity: 30,
        standardEnergyCapacityUnits: 100_000,
        standardLuggageCapacityL: 3000,
        standardComfortPermille: 500,
        allowedOptionCodes: [
          "seat_comfort",
          "long_range",
          "cargo_pack"
        ],
        active: true
      }
    ],
    options: [
      {
        code: "seat_comfort",
        name: "舒适座椅布局",
        priceDeltaCents: units.moneyCents(10_000),
        seatCapacityDelta: -4,
        energyCapacityUnitsDelta: 0,
        luggageCapacityLDelta: 0,
        comfortPermilleDelta: 120,
        mutuallyExclusiveGroup: "seat_layout",
        active: true
      },
      {
        code: "long_range",
        name: "长续航油箱",
        priceDeltaCents: units.moneyCents(8_000),
        seatCapacityDelta: 0,
        energyCapacityUnitsDelta: 20_000,
        luggageCapacityLDelta: 0,
        comfortPermilleDelta: 0,
        mutuallyExclusiveGroup: null,
        active: true
      },
      {
        code: "cargo_pack",
        name: "大行李舱",
        priceDeltaCents: units.moneyCents(5_000),
        seatCapacityDelta: -2,
        energyCapacityUnitsDelta: 0,
        luggageCapacityLDelta: 1000,
        comfortPermilleDelta: 0,
        mutuallyExclusiveGroup: null,
        active: true
      }
    ],
    configurations: [
      {
        id: standardConfigurationId,
        variantId,
        createdByCompanyId: null,
        customName: "标准配置",
        selectedOptionCodes: [],
        seatCapacity: 30,
        energyCapacityUnits: 100_000,
        luggageCapacityL: 3000,
        comfortPermille: 500,
        priceAdjustmentCents: units.moneyCents(0),
        exteriorColorCode: null,
        liveryCode: null,
        active: true
      }
    ],
    dealers: [
      {
        id: dealerId,
        name: "星河直营网点",
        kind: "manufacturer_dealer",
        regionId,
        supportedBrandIds: [brandId],
        active: true
      }
    ],
    listings: [
      {
        id: newListingId,
        dealerId,
        kind: "new",
        modelId: model.id,
        variantId,
        configurationId: standardConfigurationId,
        sellerCompanyId: null,
        sourceVehicleId: null,
        askingPriceCents: units.moneyCents(120_000),
        sellerDisclosure: null,
        reservation: null,
        stockCount: 2,
        usedSnapshot: null,
        listedAtGameSecond: units.gameSecond(0),
        availableFromGameSecond: units.gameSecond(0),
        expiresAtGameSecond: null,
        status: "available"
      },
      {
        id: usedListingId,
        dealerId,
        kind: "used",
        modelId: model.id,
        variantId,
        configurationId: standardConfigurationId,
        sellerCompanyId: null,
        sourceVehicleId: null,
        askingPriceCents: units.moneyCents(60_000),
        sellerDisclosure: null,
        reservation: null,
        stockCount: 1,
        usedSnapshot: {
          mileageM: units.distanceM(88_000_000),
          energyUnits: 35_000,
          lastMaintenanceMileageM: units.distanceM(80_000_000),
          nextMaintenanceMileageM: units.distanceM(100_000_000),
          registeredAtGameSecond: units.gameSecond(1_000),
          insuranceValidUntilGameSecond: units.gameSecond(9_000_000),
          inspectionValidUntilGameSecond: units.gameSecond(8_000_000),
          powertrainConditionPermille: units.permille(720),
          brakeConditionPermille: units.permille(760),
          tireConditionPermille: units.permille(690),
          bodyConditionPermille: units.permille(640),
          previousOwnerCount: 2,
          recordedAccidentCount: 1
        },
        listedAtGameSecond: units.gameSecond(0),
        availableFromGameSecond: units.gameSecond(0),
        expiresAtGameSecond: null,
        status: "available"
      }
    ]
  });

  const finance = createTestFinanceRepository({
    companyProfiles: [
      {
        companyId,
        openingCapitalCents: units.moneyCents(500_000),
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
    operationsSchedules: createTestOperationsScheduleRepository(),
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
    vehicleMarket,
    vehicleModels: {
      getById: (id) => id === model.id ? model : undefined
    },
    vehicles: {
      getById: (id) => vehicles.get(id),
      findByCompany: (owner) =>
        [...vehicles.values()].filter(
          (vehicle) => vehicle.companyId === owner
        ),
      save: (vehicle) => vehicles.set(vehicle.id, vehicle)
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
    nextServicePlanId: () =>
      ids.servicePlan("service_plan.00000001"),
    nextTripId: () => ids.trip("trip.000000000001"),
    nextFleetTaskId: () =>
      ids.fleetTask("fleet_task.00000001"),
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
      energyPriceMilliCentsPerUnit: () => 0,
      roadTollMilliCentsPerKm: () => 0,
      ticketTaxCents: () => units.moneyCents(0),
      stationDepartureFeeCents: () => units.moneyCents(0),
      stationArrivalFeeCents: () => units.moneyCents(0),
      stationPassengerServiceFeeCents: () => units.moneyCents(0),
      companyDailyRegulatoryFeeCents: () => units.moneyCents(0)
    },
    vehicleMarketPolicy: zeroVehicleMarketPolicy,
    vehicleLifecyclePolicy: zeroVehicleLifecyclePolicy,
    operationsPolicy: zeroOperationsPolicy
  });

  return {
    app,
    repositories,
    companyId,
    stationId,
    variantId,
    standardConfigurationId,
    newListingId,
    usedListingId
  };
}

test("custom configuration changes physical capacity without creating a duplicate VehicleModel", () => {
  const f = fixture();

  const created = f.app.commands.dispatch(
    command(
      1,
      "vehicleMarket.createConfiguration",
      f.companyId,
      {
        variantId: f.variantId,
        customName: "长途舒适版",
        selectedOptionCodes: [
          "seat_comfort",
          "long_range",
          "cargo_pack"
        ],
        exteriorColorCode: "blue",
        liveryCode: "company_a"
      }
    )
  );

  assert.equal(created.ok, true);
  if (!created.ok) return;

  const configuration = created.value as {
    readonly id: ReturnType<typeof ids.vehicleConfiguration>;
    readonly seatCapacity: number;
    readonly energyCapacityUnits: number;
    readonly luggageCapacityL: number;
    readonly comfortPermille: number;
    readonly priceAdjustmentCents: number;
  };

  assert.equal(configuration.seatCapacity, 24);
  assert.equal(configuration.energyCapacityUnits, 120_000);
  assert.equal(configuration.luggageCapacityL, 4000);
  assert.equal(configuration.comfortPermille, 620);
  assert.equal(configuration.priceAdjustmentCents, 23_000);

  const purchased = f.app.commands.dispatch(
    command(
      2,
      "vehicleMarket.purchaseListing",
      f.companyId,
      {
        companyId: f.companyId,
        listingId: f.newListingId,
        configurationId: configuration.id,
        depotStationId: f.stationId
      }
    )
  );

  assert.equal(purchased.ok, true);
  if (!purchased.ok) return;

  const vehicle = purchased.value as OwnedVehicle;
  assert.equal(vehicle.modelId, ids.vehicleModel("vehicle_model.000001"));
  assert.equal(vehicle.configurationId, configuration.id);
  assert.equal(vehicle.seatCapacity, 24);
  assert.equal(vehicle.energyCapacityUnits, 120_000);

  const listing =
    f.repositories.vehicleMarket.getListing(f.newListingId);
  assert.equal(listing?.stockCount, 1);
});

test("used vehicle purchase preserves real mileage condition documents and maintenance history", () => {
  const f = fixture();

  const purchased = f.app.commands.dispatch(
    command(
      1,
      "vehicleMarket.purchaseListing",
      f.companyId,
      {
        companyId: f.companyId,
        listingId: f.usedListingId,
        configurationId: null,
        depotStationId: f.stationId
      }
    )
  );

  assert.equal(purchased.ok, true);
  if (!purchased.ok) return;

  const vehicle = purchased.value as OwnedVehicle;
  assert.equal(Number(vehicle.mileageM), 88_000_000);
  assert.equal(vehicle.energyUnits, 35_000);
  assert.equal(Number(vehicle.powertrainConditionPermille), 720);
  assert.equal(Number(vehicle.brakeConditionPermille), 760);
  assert.equal(Number(vehicle.tireConditionPermille), 690);
  assert.equal(Number(vehicle.bodyConditionPermille), 640);
  assert.equal(Number(vehicle.lastMaintenanceMileageM), 80_000_000);
  assert.equal(Number(vehicle.nextMaintenanceMileageM), 100_000_000);
  assert.equal(Number(vehicle.registeredAtGameSecond), 1_000);
  assert.equal(
    Number(vehicle.insuranceValidUntilGameSecond),
    9_000_000
  );
  assert.equal(
    Number(vehicle.inspectionValidUntilGameSecond),
    8_000_000
  );

  assert.equal(
    f.repositories.vehicleMarket.getListing(f.usedListingId)?.status,
    "sold"
  );
});

test("used listing configuration is fixed and cannot be swapped before purchase", () => {
  const f = fixture();

  const custom = f.app.commands.dispatch(
    command(
      1,
      "vehicleMarket.createConfiguration",
      f.companyId,
      {
        variantId: f.variantId,
        customName: "偷换配置",
        selectedOptionCodes: ["long_range"],
        exteriorColorCode: null,
        liveryCode: null
      }
    )
  );
  assert.equal(custom.ok, true);
  if (!custom.ok) return;

  const customId = (
    custom.value as { readonly id: ReturnType<typeof ids.vehicleConfiguration> }
  ).id;

  const purchased = f.app.commands.dispatch(
    command(
      2,
      "vehicleMarket.purchaseListing",
      f.companyId,
      {
        companyId: f.companyId,
        listingId: f.usedListingId,
        configurationId: customId,
        depotStationId: f.stationId
      }
    )
  );

  assert.equal(purchased.ok, false);
  if (!purchased.ok) {
    assert.equal(purchased.error.code, "INVALID_ARGUMENT");
  }
});

test("market queries expose dealer stock and configurator options", async () => {
  const f = fixture();

  const listings = await f.app.queries.execute({
    type: "vehicleMarket.listings",
    payload: {
      currentGameSecond: units.gameSecond(0),
      listingKind: null
    }
  });
  assert.equal(listings.ok, true);
  if (!listings.ok) return;

  const items = listings.value as readonly {
    readonly listingKind: string;
    readonly dealerName: string;
    readonly brandName: string;
    readonly modelName: string;
    readonly stockCount: number;
    readonly mileageM: number | null;
  }[];
  assert.equal(items.length, 2);
  assert.equal(items[0]?.dealerName, "星河直营网点");
  assert.equal(items[0]?.brandName, "星河客车");
  assert.equal(
    items.some((item) => item.listingKind === "used" && item.mileageM === 88_000_000),
    true
  );

  const configurator = await f.app.queries.execute({
    type: "vehicleMarket.configurator",
    payload: { variantId: f.variantId }
  });
  assert.equal(configurator.ok, true);
  if (!configurator.ok) return;

  const view = configurator.value as {
    readonly options: readonly { readonly code: string }[];
  };
  assert.deepEqual(
    view.options.map((option) => option.code),
    ["seat_comfort", "long_range", "cargo_pack"]
  );
});
