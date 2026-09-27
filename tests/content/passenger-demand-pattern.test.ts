import assert from "node:assert/strict";
import test from "node:test";

import {
  demandPatternMultiplierPermille,
  effectiveProfileDemandPermille
} from "../../src/content/passenger/PassengerDemandPattern.js";
import { createPlayableWorldSeed } from "../../src/content/map/WorldMapSeed.js";
import { ids } from "../../src/contracts/ids/EntityIds.js";

test("business and tourism demand follow different calendar patterns", () => {
  const business = {
    originStationId: ids.station("station.a"),
    destinationStationId: ids.station("station.b"),
    basePassengersPerHour: 10,
    demandPattern: "business" as const,
    strategicDemandPermille: 1000
  };
  const tourism = {
    ...business,
    demandPattern: "tourism" as const
  };

  assert.ok(
    demandPatternMultiplierPermille(business, 1) >
      demandPatternMultiplierPermille(business, 6)
  );
  assert.ok(
    demandPatternMultiplierPermille(tourism, 6) >
      demandPatternMultiplierPermille(tourism, 1)
  );
});

test("formal OD demand carries strategic and calendar metadata", () => {
  const seed = createPlayableWorldSeed();
  assert.ok(seed.passengerDemand.length > 1000);
  assert.equal(
    seed.passengerDemand.every(
      (profile) =>
        profile.demandPattern !== undefined &&
        (profile.strategicDemandPermille ?? 0) >= 750
    ),
    true
  );
  assert.equal(
    seed.passengerDemand.some(
      (profile) =>
        (profile.strategicDemandPermille ?? 0) >= 1200
    ),
    true
  );
  assert.equal(
    seed.passengerDemand.some(
      (profile) =>
        effectiveProfileDemandPermille(profile, 6) !==
        effectiveProfileDemandPermille(profile, 1)
    ),
    true
  );
});
