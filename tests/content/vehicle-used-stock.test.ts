import assert from "node:assert/strict";
import test from "node:test";

import { units } from "../../src/core/units/Units.js";
import { SECONDS_PER_DAY } from "../../src/core/time/GameTime.js";
import { FORMAL_VEHICLE_CONTENT } from "../../src/content/vehicle/VehicleContentSeed.js";
import { VEHICLE_DEALERS } from "../../src/content/vehicle/VehicleDealerCatalog.js";
import { UsedVehicleStockGenerator } from "../../src/application/vehicle-market/UsedVehicleStockGenerator.js";
import { VehicleMarketValuationService } from "../../src/application/services/VehicleMarketValuationService.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import {
  createTestVehicleMarketRepository,
  zeroVehicleMarketPolicy
} from "../helpers/TestVehicle.js";

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
      getById: (id: Parameters<
        RepositoryBundle["vehicleModels"]["getById"]
      >[0]) => models.get(id)
    }
  } as Pick<
    RepositoryBundle,
    "vehicleMarket" | "vehicleModels"
  >;

  const valuation =
    new VehicleMarketValuationService(
      repositories as RepositoryBundle,
      {
        ...zeroVehicleMarketPolicy,
        ageValuePermille: () => units.permille(900),
        mileageValuePermille: () => units.permille(900),
        conditionValuePermille: () => units.permille(900),
        accidentValuePermille: () => units.permille(950)
      }
    );

  return {
    market,
    generator: new UsedVehicleStockGenerator(
      repositories,
      valuation
    )
  };
}

function dayStart(day: number) {
  return units.gameSecond(
    (day - 1) * SECONDS_PER_DAY
  );
}

test("dynamic used stock generates only regional and used-vehicle retail listings", () => {
  const f = fixture();
  const result = f.generator.refresh(dayStart(500));

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
        listing.supplySource === "generated_used"
    );

  assert.equal(
    generated.length,
    result.generatedListings
  );
  assert.equal(
    generated.every((listing) => {
      const kind = dealerKind.get(
        String(listing.dealerId)
      );
      return (
        kind === "regional_dealer" ||
        kind === "used_vehicle_dealer"
      );
    }),
    true
  );
  assert.equal(
    generated.every(
      (listing) =>
        listing.kind === "used" &&
        listing.stockCount === 1 &&
        listing.usedSnapshot !== null &&
        listing.configurationId !== null &&
        listing.sellerCompanyId === null &&
        listing.sourceVehicleId === null
    ),
    true
  );
  assert.equal(
    generated.every(
      (listing) =>
        dealerKind.get(String(listing.dealerId)) !==
        "auction_house"
    ),
    true
  );
});

test("same used-stock cycle is idempotent and sold generated used vehicle does not respawn", () => {
  const f = fixture();
  const first = f.generator.refresh(dayStart(500));
  assert.equal(first.generatedListings > 0, true);

  const initialCount = f.market.findListings().length;
  const firstListing = f.market.findListings()[0];
  assert.ok(firstListing);

  f.market.saveListing({
    ...firstListing,
    status: "sold",
    stockCount: 0
  });

  const second = f.generator.refresh(dayStart(503));

  assert.equal(second.cycleKey, first.cycleKey);
  assert.equal(second.generatedListings, 0);
  assert.equal(
    f.market.findListings().length,
    initialCount
  );
  assert.equal(
    f.market.getListing(firstListing.id)?.status,
    "sold"
  );
});

test("next seven-day cycle generates a fresh used batch", () => {
  const f = fixture();
  const first = f.generator.refresh(dayStart(500));
  const previousIds = new Set(
    f.market
      .findListings()
      .map((listing) => String(listing.id))
  );

  const next = f.generator.refresh(dayStart(507));

  assert.equal(next.cycleKey, first.cycleKey + 1);
  assert.equal(next.generatedListings > 0, true);

  const newIds = f.market
    .findListings()
    .map((listing) => String(listing.id))
    .filter((id) => !previousIds.has(id));

  assert.equal(
    newIds.length,
    next.generatedListings
  );
});

test("generated used vehicles contain real age mileage condition history and fixed physical configuration", () => {
  const f = fixture();
  f.generator.refresh(dayStart(500));

  const generated = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_used"
    );

  assert.equal(generated.length > 0, true);
  assert.equal(
    generated.some(
      (listing) =>
        (listing.usedSnapshot?.recordedAccidentCount ??
          0) > 0
    ),
    true
  );

  for (const listing of generated) {
    const snapshot = listing.usedSnapshot;
    assert.ok(snapshot);
    assert.equal(Number(snapshot.mileageM) >= 5_000_000, true);
    assert.equal(
      Number(snapshot.registeredAtGameSecond) <
        Number(dayStart(500)),
      true
    );
    assert.equal(
      Number(snapshot.powertrainConditionPermille) >=
        320,
      true
    );
    assert.equal(
      snapshot.previousOwnerCount >= 1,
      true
    );

    assert.ok(listing.configurationId);
    const configuration =
      f.market.getConfiguration(
        listing.configurationId
      );
    assert.ok(configuration);
    assert.equal(
      configuration.variantId,
      listing.variantId
    );
    assert.equal(
      snapshot.energyUnits <=
        configuration.energyCapacityUnits,
      true
    );
  }
});

test("generated used seller disclosure can differ from true condition without leaking the hidden snapshot", () => {
  const f = fixture();
  f.generator.refresh(dayStart(500));

  const generated = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_used" &&
        listing.sellerDisclosure !== null &&
        listing.usedSnapshot !== null
    );

  assert.equal(generated.length > 0, true);

  const mismatched = generated.filter((listing) => {
    const disclosure = listing.sellerDisclosure!;
    const snapshot = listing.usedSnapshot!;
    const actualCondition = Math.min(
      Number(snapshot.powertrainConditionPermille),
      Number(snapshot.brakeConditionPermille),
      Number(snapshot.tireConditionPermille),
      Number(snapshot.bodyConditionPermille)
    );

    return (
      (disclosure.reportedAccidentCount ?? 0) <
        snapshot.recordedAccidentCount ||
      (
        disclosure.reportedConditionPermille !== null &&
        Number(disclosure.reportedConditionPermille) >
          actualCondition
      )
    );
  });

  assert.equal(mismatched.length > 0, true);
});

test("generated used asking prices are positive and below equivalent new price for at least most inventory", () => {
  const f = fixture();
  f.generator.refresh(dayStart(500));

  const generated = f.market
    .findListings()
    .filter(
      (listing) =>
        listing.supplySource === "generated_used"
    );

  const discounted = generated.filter((listing) => {
    const variant = f.market.getVariant(
      listing.variantId
    );
    assert.ok(variant);
    const configuration =
      listing.configurationId === null
        ? undefined
        : f.market.getConfiguration(
            listing.configurationId
          );
    assert.ok(configuration);
    const equivalentConfiguredNewPrice =
      Number(variant.basePriceCents) +
      Number(configuration.priceAdjustmentCents);
    return (
      Number(listing.askingPriceCents) <
      equivalentConfiguredNewPrice
    );
  });

  assert.equal(
    generated.every(
      (listing) =>
        Number(listing.askingPriceCents) > 0
    ),
    true
  );
  assert.equal(
    discounted.length >=
      Math.floor(generated.length * 0.7),
    true
  );
});
