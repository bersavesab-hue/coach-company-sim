import assert from "node:assert/strict";
import test from "node:test";

import {
  type VehicleDealerId,
  type VehicleListingId
} from "../../src/contracts/ids/EntityIds.js";
import { SECONDS_PER_DAY } from "../../src/core/time/GameTime.js";
import { units } from "../../src/core/units/Units.js";
import { VEHICLE_VARIANTS } from "../../src/content/vehicle/VehicleVariantCatalog.js";
import { VehicleVariantLifecycleRefresher } from "../../src/application/vehicle-market/VehicleVariantLifecycleRefresher.js";
import { createTestVehicleMarketRepository } from "../helpers/TestVehicle.js";

function dayStart(day: number) {
  return units.gameSecond(
    (day - 1) * SECONDS_PER_DAY
  );
}

function transitionVariant() {
  const record = VEHICLE_VARIANTS.find(
    (value) =>
      value.lifecycle.productionEndGameDay !== null &&
      value.lifecycle.dealerClearanceEndGameDay !== null
  );
  assert.ok(record);
  return record;
}

function generatedListing(
  record: ReturnType<typeof transitionVariant>,
  phase: "normal" | "clearance"
) {
  return {
    id: (
      "vehicle_listing.lifecycle_test." + phase
    ) as VehicleListingId,
    dealerId: (
      "vehicle_dealer.lifecycle_test"
    ) as VehicleDealerId,
    kind: "new" as const,
    modelId: record.variant.modelId,
    variantId: record.variant.id,
    configurationId: null,
    sellerCompanyId: null,
    sourceVehicleId: null,
    askingPriceCents: units.moneyCents(1),
    sellerDisclosure: null,
    reservation: null,
    stockCount: 1,
    usedSnapshot: null,
    listedAtGameSecond: units.gameSecond(0),
    availableFromGameSecond: units.gameSecond(0),
    expiresAtGameSecond: null,
    status: "available" as const,
    supplySource: "generated_new" as const,
    supplyCycleKey: "0:" + phase
  };
}

test("lifecycle refresh expires a normal listing when its variant enters clearance", () => {
  const record = transitionVariant();
  const market = createTestVehicleMarketRepository({
    listings: [generatedListing(record, "normal")]
  });
  const refresher = new VehicleVariantLifecycleRefresher({
    vehicleMarket: market
  });

  const day =
    record.lifecycle.productionEndGameDay! + 1;
  const result = refresher.refresh(dayStart(day));

  assert.equal(
    result.expiredPhaseChangedListings,
    1
  );
  assert.equal(
    market.findListings()[0]?.status,
    "expired"
  );
});

test("lifecycle refresh removes generated new stock after clearance ends without deleting historical variants", () => {
  const record = transitionVariant();
  const market = createTestVehicleMarketRepository({
    variants: [record.variant],
    listings: [generatedListing(record, "clearance")]
  });
  const refresher = new VehicleVariantLifecycleRefresher({
    vehicleMarket: market
  });

  const day =
    record.lifecycle.dealerClearanceEndGameDay! + 1;
  const result = refresher.refresh(dayStart(day));

  assert.equal(
    result.expiredUnavailableListings,
    1
  );
  assert.equal(
    market.findListings()[0]?.status,
    "expired"
  );
  assert.equal(
    market.getVariant(record.variant.id)?.active,
    true
  );
});
