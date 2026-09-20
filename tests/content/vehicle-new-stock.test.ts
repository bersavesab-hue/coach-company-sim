import assert from "node:assert/strict";
import test from "node:test";

import { units } from "../../src/core/units/Units.js";
import { SECONDS_PER_DAY } from "../../src/core/time/GameTime.js";
import { FORMAL_VEHICLE_CONTENT } from "../../src/content/vehicle/VehicleContentSeed.js";
import { VEHICLE_DEALERS } from "../../src/content/vehicle/VehicleDealerCatalog.js";
import { NewVehicleStockGenerator } from "../../src/application/vehicle-market/NewVehicleStockGenerator.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import { createTestVehicleMarketRepository } from "../helpers/TestVehicle.js";

function fixture() {
  const market = createTestVehicleMarketRepository({
    brands: FORMAL_VEHICLE_CONTENT.brands,
    series: FORMAL_VEHICLE_CONTENT.series,
    modelIdentities:
      FORMAL_VEHICLE_CONTENT.modelIdentities,
    variants: FORMAL_VEHICLE_CONTENT.variants,
    options: FORMAL_VEHICLE_CONTENT.options,
    dealers: FORMAL_VEHICLE_CONTENT.dealers
  });

  const models = new Map(
    FORMAL_VEHICLE_CONTENT.models.map((model) => [
      model.id,
      model
    ])
  );

  const repositories = {
    vehicleMarket: market,
    vehicleModels: {
      getById: (id) => models.get(id)
    }
  } as Pick<
    RepositoryBundle,
    "vehicleMarket" | "vehicleModels"
  >;

  return {
    market,
    generator: new NewVehicleStockGenerator(
      repositories
    )
  };
}

function dayStart(day: number) {
  return units.gameSecond(
    (day - 1) * SECONDS_PER_DAY
  );
}

test("dynamic new stock generates only manufacturer and regional listings", () => {
  const f = fixture();
  const result = f.generator.refresh(dayStart(150));

  assert.equal(result.generatedListings > 0, true);

  const dealerKind = new Map(
    VEHICLE_DEALERS.map((record) => [
      String(record.dealer.id),
      record.dealer.kind
    ])
  );

  const generated = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_new"
    );

  assert.equal(
    generated.length,
    result.generatedListings
  );
  assert.equal(
    generated.every(
      (listing) =>
        dealerKind.get(String(listing.dealerId)) ===
          "manufacturer_dealer" ||
        dealerKind.get(String(listing.dealerId)) ===
          "regional_dealer"
    ),
    true
  );
  assert.equal(
    generated.every(
      (listing) =>
        listing.kind === "new" &&
        listing.usedSnapshot === null &&
        listing.sellerCompanyId === null &&
        listing.sourceVehicleId === null
    ),
    true
  );
});

test("same stock cycle is idempotent and sold stock does not instantly respawn", () => {
  const f = fixture();
  const first = f.generator.refresh(dayStart(150));
  assert.equal(first.generatedListings > 0, true);

  const initialCount = f.market.findListings().length;
  const firstListing = f.market.findListings()[0];
  assert.ok(firstListing);

  f.market.saveListing({
    ...firstListing,
    stockCount: 0,
    status: "sold"
  });

  const second = f.generator.refresh(
    units.gameSecond(
      Number(dayStart(150)) + 2 * SECONDS_PER_DAY
    )
  );

  assert.equal(second.cycleKey, first.cycleKey);
  assert.equal(second.generatedListings, 0);
  assert.equal(f.market.findListings().length, initialCount);
  assert.equal(
    f.market.getListing(firstListing.id)?.status,
    "sold"
  );
});

test("next seven-day cycle produces a fresh deterministic stock batch", () => {
  const f = fixture();
  const first = f.generator.refresh(dayStart(150));
  const firstIds = new Set(
    f.market
      .findListings()
      .map((listing) => String(listing.id))
  );

  const next = f.generator.refresh(dayStart(157));

  assert.equal(next.cycleKey, first.cycleKey + 1);
  assert.equal(next.generatedListings > 0, true);

  const newIds = f.market
    .findListings()
    .map((listing) => String(listing.id))
    .filter((id) => !firstIds.has(id));

  assert.equal(newIds.length, next.generatedListings);
});

test("generated listings receive formal standard configurations and finite stock", () => {
  const f = fixture();
  f.generator.refresh(dayStart(150));

  const generated = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_new"
    );

  assert.equal(generated.length > 0, true);
  for (const listing of generated) {
    assert.equal(listing.configurationId !== null, true);
    assert.equal(listing.stockCount >= 1, true);
    assert.equal(listing.stockCount <= 8, true);

    const configuration =
      listing.configurationId === null
        ? undefined
        : f.market.getConfiguration(
            listing.configurationId
          );
    assert.ok(configuration);
    assert.equal(
      configuration.variantId,
      listing.variantId
    );
    assert.equal(
      Number(configuration.priceAdjustmentCents),
      0
    );
  }
});

test("clearance lifecycle creates discounted one-unit stock", () => {
  const f = fixture();
  const result = f.generator.refresh(dayStart(150));

  assert.equal(result.clearanceListings > 0, true);

  const clearance = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_new" &&
        listing.stockCount === 1
    );

  assert.equal(clearance.length > 0, true);

  for (const listing of clearance) {
    const variant = f.market.getVariant(
      listing.variantId
    );
    assert.ok(variant);
    assert.equal(
      Number(listing.askingPriceCents) <
        Number(variant.basePriceCents) * 1.2,
      true
    );
  }
});
