import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { VehicleContentAccessService } from "../../src/application/services/VehicleContentAccessService.js";
import { VEHICLE_BRANDS } from "../../src/content/vehicle/VehicleBrandCatalog.js";
import { VEHICLE_SERIES } from "../../src/content/vehicle/VehicleSeriesCatalog.js";
import { VEHICLE_MODELS } from "../../src/content/vehicle/VehicleModelCatalog.js";
import { validateVehicleContent } from "../../src/content/vehicle/VehicleContentValidator.js";
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


test("first formal vehicle batch remains a valid 20-model opening slice", () => {
  const firstBatch = VEHICLE_MODELS.slice(0, 20);
  const result = validateVehicleContent({
    brands: VEHICLE_BRANDS,
    series: VEHICLE_SERIES,
    models: firstBatch,
    expectedModelCount: 20
  });

  assert.equal(result.valid, true);
  assert.equal(result.counts.models, 20);
  assert.equal(result.counts.plannedModels, 100);
  assert.deepEqual(
    result.issues.filter((issue) => issue.severity === "error"),
    []
  );
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.code === "DUPLICATE_TECHNICAL_MODEL"
    ),
    []
  );

  assert.deepEqual(
    firstBatch.map((record) => record.identity.displayName),
    [
      "江驰 V5",
      "江驰 V6",
      "江驰 V6L",
      "江驰 V7",
      "江驰 M6",
      "江驰 M7",
      "江驰 M8",
      "江驰 M8L",
      "宇盛 M6",
      "宇盛 M7",
      "宇盛 M8",
      "宇盛 C8",
      "宇盛 C9",
      "宇盛 C10",
      "中衡 C7",
      "中衡 C8",
      "中衡 C9",
      "金程 J7",
      "金程 J8",
      "金程 J9"
    ]
  );
});

test("individual models inside the same series unlock progressively", () => {
  const v5 = VEHICLE_MODELS.find(
    (record) => record.identity.displayName === "江驰 V5"
  );
  const v7 = VEHICLE_MODELS.find(
    (record) => record.identity.displayName === "江驰 V7"
  );
  assert.ok(v5);
  assert.ok(v7);

  const companyId = ids.company("company.00000001");
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
      getModelIdentity: (id: unknown) =>
        VEHICLE_MODELS.find((record) => record.model.id === id)?.identity
    }
  } as unknown as RepositoryBundle;

  const access = new VehicleContentAccessService(repositories);

  assert.equal(
    access.evaluateModel(
      companyId,
      v5.model.id,
      units.gameSecond(0)
    ).unlocked,
    true
  );

  const v7Result = access.evaluateModel(
    companyId,
    v7.model.id,
    units.gameSecond(0)
  );
  assert.equal(v7Result.unlocked, false);
  assert.equal(v7Result.missing.includes("game_day"), true);
  assert.equal(v7Result.missing.includes("reputation"), true);
  assert.equal(v7Result.missing.includes("fleet_size"), true);
});


test("stage 15 base vehicle catalog is complete at 100 models across all 32 series", () => {
  const result = validateVehicleContent({
    brands: VEHICLE_BRANDS,
    series: VEHICLE_SERIES,
    models: VEHICLE_MODELS,
    expectedModelCount: 100,
    requireCompleteSeries: true
  });

  assert.equal(result.valid, true);
  assert.equal(result.counts.models, 100);
  assert.equal(result.counts.plannedModels, 100);
  assert.deepEqual(
    result.issues.filter((issue) => issue.severity === "error"),
    []
  );
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.code === "DUPLICATE_TECHNICAL_MODEL"
    ),
    []
  );

  const modelCountBySeries = new Map<string, number>();
  for (const record of VEHICLE_MODELS) {
    const key = String(record.identity.seriesId);
    modelCountBySeries.set(
      key,
      (modelCountBySeries.get(key) ?? 0) + 1
    );
  }

  for (const series of VEHICLE_SERIES) {
    assert.equal(
      modelCountBySeries.get(String(series.series.id)),
      series.plannedModelCount,
      `series count mismatch: ${series.series.id}`
    );
  }
});

test("all 28 imported base models unlock no earlier than tier 4", () => {
  const importedBrandIds = new Set(
    VEHICLE_BRANDS
      .filter((record) => record.origin === "imported")
      .map((record) => String(record.brand.id))
  );
  const importedSeriesIds = new Set(
    VEHICLE_SERIES
      .filter((record) =>
        importedBrandIds.has(String(record.series.brandId))
      )
      .map((record) => String(record.series.id))
  );
  const importedModels = VEHICLE_MODELS.filter((record) =>
    importedSeriesIds.has(String(record.identity.seriesId))
  );

  assert.equal(importedModels.length, 28);
  assert.equal(
    importedModels.every(
      (record) => record.metadata.unlock.tier >= 4
    ),
    true
  );
});

test("Yunchi electric family uses electric energy units", () => {
  const yunchiSeriesIds = new Set(
    VEHICLE_SERIES
      .filter(
        (record) =>
          String(record.series.brandId) ===
          "vehicle_brand.yunchi"
      )
      .map((record) => String(record.series.id))
  );
  const yunchiModels = VEHICLE_MODELS.filter((record) =>
    yunchiSeriesIds.has(String(record.identity.seriesId))
  );

  assert.equal(yunchiModels.length, 11);
  assert.equal(
    yunchiModels.every(
      (record) => record.model.energyKind === "electric_wh"
    ),
    true
  );
});
