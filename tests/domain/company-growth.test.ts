import assert from "node:assert/strict";
import test from "node:test";

import {
  companyLevelDefinitionForReputation,
  companyLicenseIdsForReputation,
  requiredLicenseForRouteType,
  standardRouteTypeForDistanceM
} from "../../src/content/company/CompanyGrowthRules.js";
import { FORMAL_WORLD_MAP_CONTENT } from "../../src/content/map/FormalWorldMapContent.js";
import { isMapStationUnlocked } from "../../src/content/map/MapStationUnlockPolicy.js";

test("company growth grants one new passenger license at each level", () => {
  assert.equal(
    companyLevelDefinitionForReputation(180).level,
    1
  );
  assert.equal(
    companyLicenseIdsForReputation(180).length,
    1
  );
  assert.equal(
    companyLevelDefinitionForReputation(350).level,
    3
  );
  assert.equal(
    companyLicenseIdsForReputation(350).length,
    3
  );
  assert.equal(
    companyLevelDefinitionForReputation(850).level,
    6
  );
  assert.equal(
    companyLicenseIdsForReputation(850).length,
    6
  );
});

test("standard route distance maps to staged operating licenses", () => {
  assert.equal(standardRouteTypeForDistanceM(200_000), "county");
  assert.equal(standardRouteTypeForDistanceM(400_000), "intercounty");
  assert.equal(standardRouteTypeForDistanceM(700_000), "intercity");
  assert.equal(standardRouteTypeForDistanceM(1_100_000), "interprovincial");

  assert.equal(
    requiredLicenseForRouteType("county").name,
    "县域客运许可"
  );
  assert.equal(
    requiredLicenseForRouteType("interprovincial").name,
    "跨区干线许可"
  );
});

test("the 48 fictional cities unlock in six eight-city stages", () => {
  assert.equal(FORMAL_WORLD_MAP_CONTENT.stations.length, 48);
  for (let level = 1; level <= 6; level += 1) {
    assert.equal(
      FORMAL_WORLD_MAP_CONTENT.stations.filter(
        (station) => station.unlockCompanyLevel === level
      ).length,
      8
    );
  }

  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.stations.filter(
      (station) => isMapStationUnlocked(station, 180)
    ).length,
    8
  );
  assert.equal(
    FORMAL_WORLD_MAP_CONTENT.stations.filter(
      (station) => isMapStationUnlocked(station, 1000)
    ).length,
    48
  );
});
