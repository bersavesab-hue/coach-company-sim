import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { VehicleContentAccessService } from "../../src/application/services/VehicleContentAccessService.js";
import { VEHICLE_BRANDS } from "../../src/content/vehicle/VehicleBrandCatalog.js";
import { VEHICLE_SERIES } from "../../src/content/vehicle/VehicleSeriesCatalog.js";
import {
  evaluateVehicleUnlock,
  vehicleUnlockRuleForTier
} from "../../src/content/vehicle/VehicleUnlockRules.js";

test("stage 15 freezes 10 brands, 32 series and 100 planned models", () => {
  assert.equal(VEHICLE_BRANDS.length, 10);
  assert.equal(VEHICLE_SERIES.length, 32);

  const brandOrigin = new Map(
    VEHICLE_BRANDS.map((record) => [
      String(record.brand.id),
      record.origin
    ])
  );

  assert.equal(
    VEHICLE_BRANDS.filter((record) => record.origin === "domestic").length,
    6
  );
  assert.equal(
    VEHICLE_BRANDS.filter((record) => record.origin === "imported").length,
    4
  );

  const domesticSeries = VEHICLE_SERIES.filter(
    (record) =>
      brandOrigin.get(String(record.series.brandId)) === "domestic"
  );
  const importedSeries = VEHICLE_SERIES.filter(
    (record) =>
      brandOrigin.get(String(record.series.brandId)) === "imported"
  );

  assert.equal(domesticSeries.length, 20);
  assert.equal(importedSeries.length, 12);

  assert.equal(
    domesticSeries.reduce(
      (sum, record) => sum + record.plannedModelCount,
      0
    ),
    72
  );
  assert.equal(
    importedSeries.reduce(
      (sum, record) => sum + record.plannedModelCount,
      0
    ),
    28
  );
  assert.equal(
    VEHICLE_SERIES.reduce(
      (sum, record) => sum + record.plannedModelCount,
      0
    ),
    100
  );

  assert.equal(
    importedSeries.every((record) => record.baseUnlockTier >= 4),
    true
  );
});

test("vehicle unlock tiers require time, reputation and fleet growth", () => {
  const company: Company = {
    id: ids.company("company.00000001"),
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: null
  };

  const tier1 = evaluateVehicleUnlock(
    vehicleUnlockRuleForTier(1),
    {
      company,
      gameDay: 1,
      ownedVehicleCount: 0
    }
  );
  assert.equal(tier1.unlocked, true);

  const tier2 = evaluateVehicleUnlock(
    vehicleUnlockRuleForTier(2),
    {
      company,
      gameDay: 1,
      ownedVehicleCount: 0
    }
  );
  assert.equal(tier2.unlocked, false);
  assert.deepEqual(tier2.missing, [
    "game_day",
    "reputation",
    "fleet_size"
  ]);

  const grownCompany: Company = {
    ...company,
    reputationPermille: units.permille(450)
  };
  const tier4 = evaluateVehicleUnlock(
    vehicleUnlockRuleForTier(4),
    {
      company: grownCompany,
      gameDay: 20,
      ownedVehicleCount: 10
    }
  );
  assert.equal(tier4.unlocked, true);
});

test("formal premium series remain locked even if a listing appears early", () => {
  const companyId = ids.company("company.00000001");
  const modelId = ids.vehicleModel("vehicle_model.test_premium");
  const premiumSeriesId = ids.vehicleSeries("vehicle_series.yusheng_x");

  const company: Company = {
    id: companyId,
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: null
  };

  const repositories = {
    companies: {
      getById: () => company
    },
    vehicles: {
      findByCompany: () => []
    },
    vehicleMarket: {
      getModelIdentity: () => ({
        modelId,
        seriesId: premiumSeriesId,
        displayName: "宇盛 X12",
        productionStartYear: 2026,
        productionEndYear: null
      })
    }
  } as unknown as RepositoryBundle;

  const access = new VehicleContentAccessService(repositories);
  const result = access.evaluateModel(
    companyId,
    modelId,
    units.gameSecond(0)
  );

  assert.equal(result.tier, 5);
  assert.equal(result.unlocked, false);
  assert.deepEqual(result.missing, [
    "game_day",
    "reputation",
    "fleet_size"
  ]);
});
