import assert from "node:assert/strict";
import test from "node:test";

import {
  quoteVehicleMarketDemand,
  vehicleMarketDemandPricePermille
} from "../../src/application/services/VehicleMarketDemandService.js";
import { VEHICLE_DEALERS } from "../../src/content/vehicle/VehicleDealerCatalog.js";
import { VEHICLE_MARKET_ZONE_DEMAND_PROFILES } from "../../src/content/vehicle/VehicleMarketDemandCatalog.js";
import { validateVehicleMarketDemandContent } from "../../src/content/vehicle/VehicleMarketDemandContentValidator.js";

test("stage 15 defines all six formal vehicle market demand zones", () => {
  const result = validateVehicleMarketDemandContent({
    profiles: VEHICLE_MARKET_ZONE_DEMAND_PROFILES,
    dealers: VEHICLE_DEALERS
  });

  assert.equal(result.valid, true);
  assert.equal(result.counts.zones, 6);
  assert.equal(result.counts.zonedDealers, 14);
  assert.deepEqual(
    result.issues.filter(
      (issue) => issue.severity === "error"
    ),
    []
  );
});

test("market zones create real role and new-energy demand differences", () => {
  const eastElectric = quoteVehicleMarketDemand({
    zoneCode: "east",
    role: "intercity_coach",
    energyKind: "electric_wh",
    basePriceCents: 800_000 * 100
  });
  const northeastElectric =
    quoteVehicleMarketDemand({
      zoneCode: "northeast",
      role: "intercity_coach",
      energyKind: "electric_wh",
      basePriceCents: 800_000 * 100
    });

  assert.equal(
    eastElectric.energyDemandPermille >
      northeastElectric.energyDemandPermille,
    true
  );
  assert.notEqual(
    eastElectric.combinedDemandPermille,
    northeastElectric.combinedDemandPermille
  );
  assert.notEqual(
    vehicleMarketDemandPricePermille(
      eastElectric.combinedDemandPermille
    ),
    vehicleMarketDemandPricePermille(
      northeastElectric.combinedDemandPermille
    )
  );
});

test("price-sensitive zones penalize expensive vehicles more strongly", () => {
  const westBudget = quoteVehicleMarketDemand({
    zoneCode: "west",
    role: "county_midibus",
    energyKind: "diesel_ml",
    basePriceCents: 250_000 * 100
  });
  const westPremium = quoteVehicleMarketDemand({
    zoneCode: "west",
    role: "county_midibus",
    energyKind: "diesel_ml",
    basePriceCents: 1_300_000 * 100
  });

  assert.equal(
    westBudget.affordabilityPermille >
      westPremium.affordabilityPermille,
    true
  );
});
