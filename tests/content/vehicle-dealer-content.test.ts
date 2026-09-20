import assert from "node:assert/strict";
import test from "node:test";

import { VEHICLE_BRANDS } from "../../src/content/vehicle/VehicleBrandCatalog.js";
import { VEHICLE_DEALERS } from "../../src/content/vehicle/VehicleDealerCatalog.js";
import { validateVehicleDealerContent } from "../../src/content/vehicle/VehicleDealerContentValidator.js";

test("stage 15 contains exactly 24 formal vehicle dealers in 10/6/5/3 distribution", () => {
  const result = validateVehicleDealerContent({
    brands: VEHICLE_BRANDS,
    dealers: VEHICLE_DEALERS,
    expectedDealerCount: 24
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.counts, {
    total: 24,
    manufacturer: 10,
    regional: 6,
    used: 5,
    auction: 3
  });
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.severity === "error"
    ),
    []
  );
});

test("each formal brand has exactly one manufacturer dealer network", () => {
  for (const brand of VEHICLE_BRANDS) {
    const networks = VEHICLE_DEALERS.filter(
      (record) =>
        record.dealer.kind === "manufacturer_dealer" &&
        record.dealer.supportedBrandIds.includes(
          brand.brand.id
        )
    );
    assert.equal(
      networks.length,
      1,
      `manufacturer network mismatch: ${brand.brand.id}`
    );
  }
});

test("non-manufacturer dealers use market zones without inventing world RegionIds", () => {
  const nonManufacturer = VEHICLE_DEALERS.filter(
    (record) =>
      record.dealer.kind !== "manufacturer_dealer"
  );

  assert.equal(
    nonManufacturer.every(
      (record) => record.marketZoneCode !== null
    ),
    true
  );
  assert.equal(
    VEHICLE_DEALERS.every(
      (record) => record.dealer.regionId === null
    ),
    true
  );
});

test("used dealers and auction houses cannot generate normal new-car stock", () => {
  const usedSources = VEHICLE_DEALERS.filter(
    (record) =>
      record.dealer.kind === "used_vehicle_dealer" ||
      record.dealer.kind === "auction_house"
  );

  assert.equal(
    usedSources.every(
      (record) => record.newStockWeightPermille === 0
    ),
    true
  );
  assert.equal(
    usedSources.every(
      (record) => record.usedSupplyWeightPermille > 0
    ),
    true
  );
});

test("manufacturer and regional dealers provide new-car supply profiles", () => {
  const newSources = VEHICLE_DEALERS.filter(
    (record) =>
      record.dealer.kind === "manufacturer_dealer" ||
      record.dealer.kind === "regional_dealer"
  );

  assert.equal(
    newSources.every(
      (record) => record.newStockWeightPermille > 0
    ),
    true
  );
});
