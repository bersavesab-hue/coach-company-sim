import assert from "node:assert/strict";
import test from "node:test";

import { VEHICLE_MODELS } from "../../src/content/vehicle/VehicleModelCatalog.js";
import { VEHICLE_VARIANTS } from "../../src/content/vehicle/VehicleVariantCatalog.js";
import {
  ALL_VEHICLE_OPTION_CODES
} from "../../src/content/vehicle/VehicleOptionCodes.js";
import { validateVehicleVariantContent } from "../../src/content/vehicle/VehicleVariantContentValidator.js";

test("stage 15 contains exactly 180 formal variants for 100 base models", () => {
  const result = validateVehicleVariantContent({
    models: VEHICLE_MODELS,
    variants: VEHICLE_VARIANTS,
    expectedVariantCount: 180
  });

  assert.equal(result.valid, true);
  assert.equal(result.counts.models, 100);
  assert.equal(result.counts.variants, 180);
  assert.equal(result.counts.modelsWithVariant, 100);
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.severity === "error"
    ),
    []
  );
});

test("variant distribution is 40 single, 40 double and 20 triple models", () => {
  const counts = new Map<string, number>();
  for (const record of VEHICLE_VARIANTS) {
    const key = String(record.variant.modelId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const values = [...counts.values()];
  assert.equal(values.filter((value) => value === 1).length, 40);
  assert.equal(values.filter((value) => value === 2).length, 40);
  assert.equal(values.filter((value) => value === 3).length, 20);
});

test("all 48 option codes are frozen before option definitions are filled", () => {
  assert.equal(ALL_VEHICLE_OPTION_CODES.length, 48);
  assert.equal(new Set(ALL_VEHICLE_OPTION_CODES).size, 48);
});

test("variant editions change price comfort or physical configuration without creating new VehicleModels", () => {
  const grouped = new Map<
    string,
    typeof VEHICLE_VARIANTS
  >();

  for (const record of VEHICLE_VARIANTS) {
    const key = String(record.variant.modelId);
    const group = grouped.get(key) ?? [];
    grouped.set(key, [...group, record]);
  }

  for (const records of grouped.values()) {
    if (records.length < 2) continue;

    const sorted = [...records].sort(
      (a, b) =>
        a.variant.modelYear - b.variant.modelYear
    );
    assert.equal(
      sorted[1]!.variant.basePriceCents >
        sorted[0]!.variant.basePriceCents,
      true
    );
    assert.equal(
      sorted[1]!.variant.standardComfortPermille >
        sorted[0]!.variant.standardComfortPermille,
      true
    );
  }
});

test("electric variants retain electric-scale energy capacity and offer electric options", () => {
  const electricModelIds = new Set(
    VEHICLE_MODELS
      .filter(
        (record) => record.model.energyKind === "electric_wh"
      )
      .map((record) => String(record.model.id))
  );
  const electricVariants = VEHICLE_VARIANTS.filter(
    (record) =>
      electricModelIds.has(String(record.variant.modelId))
  );

  assert.equal(electricVariants.length > 11, true);
  assert.equal(
    electricVariants.every((record) =>
      record.variant.allowedOptionCodes.includes(
        "climate_heat_pump"
      )
    ),
    true
  );
});
