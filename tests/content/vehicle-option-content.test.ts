import assert from "node:assert/strict";
import test from "node:test";

import { ids } from "../../src/contracts/ids/EntityIds.js";
import { createVehicleConfiguration } from "../../src/domain/vehicle-market/VehicleConfigurationRules.js";
import { VEHICLE_MODELS } from "../../src/content/vehicle/VehicleModelCatalog.js";
import { VEHICLE_OPTIONS } from "../../src/content/vehicle/VehicleOptionCatalog.js";
import { ALL_VEHICLE_OPTION_CODES } from "../../src/content/vehicle/VehicleOptionCodes.js";
import { validateVehicleOptionContent } from "../../src/content/vehicle/VehicleOptionContentValidator.js";
import { VEHICLE_VARIANTS } from "../../src/content/vehicle/VehicleVariantCatalog.js";

test("stage 15 contains exactly 48 formal vehicle option definitions", () => {
  const result = validateVehicleOptionContent({
    models: VEHICLE_MODELS,
    variants: VEHICLE_VARIANTS,
    options: VEHICLE_OPTIONS,
    expectedOptionCount: 48
  });

  assert.equal(result.valid, true);
  assert.equal(result.counts.definitions, 48);
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.severity === "error"
    ),
    []
  );
});

test("formal option definitions cover every frozen option code exactly once", () => {
  assert.equal(VEHICLE_OPTIONS.length, 48);
  assert.equal(
    new Set(VEHICLE_OPTIONS.map((option) => option.code)).size,
    48
  );
  assert.deepEqual(
    [...VEHICLE_OPTIONS.map((option) => option.code)].sort(),
    [...ALL_VEHICLE_OPTION_CODES].sort()
  );
});

test("seat, energy, luggage, climate and paint choices use formal mutual exclusion groups", () => {
  const expected = new Map<string, string>([
    ["seat_standard", "seat_layout"],
    ["energy_standard", "energy_package"],
    ["luggage_standard", "luggage_package"],
    ["climate_standard", "climate_package"],
    ["operation_standard_livery", "paint_finish"]
  ]);

  for (const [code, group] of expected) {
    assert.equal(
      VEHICLE_OPTIONS.find(
        (option) => option.code === code
      )?.mutuallyExclusiveGroup,
      group
    );
  }

  assert.equal(
    VEHICLE_OPTIONS.find(
      (option) => option.code === "comfort_wifi"
    )?.mutuallyExclusiveGroup,
    null
  );
  assert.equal(
    VEHICLE_OPTIONS.find(
      (option) => option.code === "safety_esc"
    )?.mutuallyExclusiveGroup,
    null
  );
});

test("touring vehicle can combine layout, range, luggage, climate and stackable service equipment", () => {
  const variantRecord = VEHICLE_VARIANTS.find(
    (record) =>
      record.variant.allowedOptionCodes.includes(
        "luggage_tourism"
      ) &&
      record.variant.allowedOptionCodes.includes(
        "seat_business"
      ) &&
      record.variant.allowedOptionCodes.includes(
        "climate_premium"
      )
  );
  assert.ok(variantRecord);

  const selectedCodes = [
    "seat_business",
    "energy_long_range",
    "luggage_tourism",
    "climate_premium",
    "comfort_usb",
    "comfort_wifi",
    "safety_esc",
    "service_refrigerator",
    "operation_premium_paint"
  ];

  const selected = selectedCodes.map((code) => {
    const option = VEHICLE_OPTIONS.find(
      (value) => value.code === code
    );
    assert.ok(option);
    return option;
  });

  const created = createVehicleConfiguration({
    id: ids.vehicleConfiguration(
      "vehicle_configuration.option_test"
    ),
    variant: variantRecord.variant,
    createdByCompanyId: null,
    customName: "测试旅游配置",
    selectedOptions: selected,
    exteriorColorCode: "deep_blue",
    liveryCode: "touring"
  });

  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(
    created.value.seatCapacity <
      variantRecord.variant.standardSeatCapacity,
    true
  );
  assert.equal(
    created.value.energyCapacityUnits >
      variantRecord.variant.standardEnergyCapacityUnits,
    true
  );
  assert.equal(
    created.value.luggageCapacityL >
      variantRecord.variant.standardLuggageCapacityL,
    true
  );
  assert.equal(
    created.value.priceAdjustmentCents > 0,
    true
  );
});

test("mutually exclusive layout choices are rejected by configuration rules", () => {
  const variantRecord = VEHICLE_VARIANTS.find(
    (record) =>
      record.variant.allowedOptionCodes.includes(
        "seat_standard"
      ) &&
      record.variant.allowedOptionCodes.includes(
        "seat_comfort"
      )
  );
  assert.ok(variantRecord);

  const standard = VEHICLE_OPTIONS.find(
    (option) => option.code === "seat_standard"
  );
  const comfort = VEHICLE_OPTIONS.find(
    (option) => option.code === "seat_comfort"
  );
  assert.ok(standard);
  assert.ok(comfort);

  const created = createVehicleConfiguration({
    id: ids.vehicleConfiguration(
      "vehicle_configuration.mutex_test"
    ),
    variant: variantRecord.variant,
    createdByCompanyId: null,
    customName: null,
    selectedOptions: [standard, comfort],
    exteriorColorCode: null,
    liveryCode: null
  });

  assert.equal(created.ok, false);
  if (!created.ok) {
    assert.equal(created.error.code, "INVALID_ARGUMENT");
  }
});
