import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");

const forbiddenDirs = new Set(["legacy", "old", "backup"]);
const forbiddenFilePatterns = [
  /V2\.ts$/i,
  /New\.ts$/i,
  /Final\.ts$/i,
  /Old\.ts$/i,
  /Legacy\.ts$/i,
  /GameManager\.ts$/i,
  /MainController\.ts$/i
];

const explicitlyRemoved = new Set([
  "src/application/PassengerTransportApp.ts",
  "src/application/commands.ts",
  "src/core/GameClock.ts",
  "src/core/events.ts",
  "src/core/units.ts",
  "src/core/version.ts",
  "src/demo/createDemoState.ts",
  "src/domain/company.ts",
  "src/domain/map.ts",
  "src/domain/route.ts",
  "src/domain/vehicle.ts",
  "src/simulation/PassengerDemandSystem.ts",
  "src/simulation/VehicleMovementSystem.ts",
  "src/simulation/mapGeometry.ts",
  "src/state/GameState.ts",
  "src/index.ts",
  "src/save/SaveCodec.ts"
]);

const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      if (forbiddenDirs.has(entry.name.toLowerCase())) {
        failures.push(`Forbidden directory: ${rel}`);
      }
      results.push(...walk(full));
      continue;
    }

    if (forbiddenFilePatterns.some((pattern) => pattern.test(entry.name))) {
      failures.push(`Forbidden filename: ${rel}`);
    }

    results.push(full);
  }
  return results;
}

const sourceFiles = walk(srcRoot).filter((file) => file.endsWith(".ts"));

for (const removed of explicitlyRemoved) {
  if (fs.existsSync(path.join(root, removed))) {
    failures.push(`Removed V0.1 path still exists: ${removed}`);
  }
}

for (const file of sourceFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const text = fs.readFileSync(file, "utf8");

  if (rel.startsWith("src/domain/")) {
    for (const banned of [
      "/presentation/",
      "/application/",
      "react",
      "android",
      "canvas"
    ]) {
      if (text.includes(banned)) {
        failures.push(`Domain boundary violation in ${rel}: ${banned}`);
      }
    }
  }

  if (rel.startsWith("src/simulation/")) {
    for (const banned of [
      "/presentation/",
      "/application/",
      "react",
      "android",
      "canvas"
    ]) {
      if (text.includes(banned)) {
        failures.push(`Simulation boundary violation in ${rel}: ${banned}`);
      }
    }
  }

  if (rel.includes("/vehicle/OwnedVehicle.ts")) {
    for (const forbiddenField of [
      "routeId:",
      "worldPosition:",
      "routeSegmentIndex:",
      "offsetOnSegmentM:",
      "conditionPermille:",
      "fuelPermille:"
    ]) {
      if (text.includes(forbiddenField)) {
        failures.push(
          `Vehicle runtime ownership violation in ${rel}: ${forbiddenField}`
        );
      }
    }

    for (const requiredField of [
      "energyUnits:",
      "powertrainConditionPermille:",
      "brakeConditionPermille:",
      "tireConditionPermille:",
      "insuranceValidUntilGameSecond:",
      "inspectionValidUntilGameSecond:",
      "currentStationId:",
      "availableAtGameSecond:",
      "activeFleetTaskId:"
    ]) {
      if (!text.includes(requiredField)) {
        failures.push(
          `OwnedVehicle missing Stage 8 technical field in ${rel}: ${requiredField}`
        );
      }
    }
  }

  if (text.includes('"vehicle.completeMaintenance"')) {
    failures.push(
      `Removed Stage 8 manual maintenance command returned in ${rel}`
    );
  }

  if (
    text.includes("reserveVehicleForTrip") ||
    text.includes("reserveDriverForTrip")
  ) {
    failures.push(
      `Removed Stage 8 single-trip reservation API returned in ${rel}`
    );
  }

  if (rel.includes("/staff/Driver.ts")) {
    for (const requiredField of [
      "currentStationId:",
      "availableAtGameSecond:",
      "dutyStartedAtGameSecond:",
      "lastDutyEndedAtGameSecond:",
      "continuousDrivingSeconds:",
      "activeFleetTaskId:"
    ]) {
      if (!text.includes(requiredField)) {
        failures.push(
          `Driver missing Stage 9 operations field in ${rel}: ${requiredField}`
        );
      }
    }
  }

  if (rel.includes("/trip/TripInstance.ts") && !text.includes("recoveryStationId:")) {
    failures.push(
      "TripInstance must retain recoveryStationId for disrupted-trip substitution"
    );
  }

  if (rel.includes("/services/DayOperationsPlanner.ts")) {
    for (const forbiddenMutation of [
      ".save(",
      ".replace("
    ]) {
      if (text.includes(forbiddenMutation)) {
        failures.push(
          `DayOperationsPlanner must remain read-only in ${rel}: ${forbiddenMutation}`
        );
      }
    }

    for (const requiredPlanningToken of [
      "maintenance",
      "refuel",
      "deadhead",
      "rest",
      "uncovered"
    ]) {
      if (!text.includes(requiredPlanningToken)) {
        failures.push(
          `DayOperationsPlanner missing Stage 10 planning capability in ${rel}: ${requiredPlanningToken}`
        );
      }
    }
  }

  if (rel.includes("/repositories/VehicleRepository.ts") && !text.includes("findByCompany(")) {
    failures.push(
      "VehicleRepository must support company fleet discovery for Stage 10"
    );
  }

  if (rel.includes("/repositories/StaffRepository.ts") && !text.includes("findDriversByCompany(")) {
    failures.push(
      "StaffRepository must support company driver discovery for Stage 10"
    );
  }

  if (rel.includes("/operations/OperationsExecutionCoordinator.ts")) {
    for (const forbiddenMutation of [
      "repositories.vehicles.save(",
      "repositories.staff.saveDriver(",
      "repositories.trips.save(",
      "repositories.fleetTasks.save("
    ]) {
      if (text.includes(forbiddenMutation)) {
        failures.push(
          `OperationsExecutionCoordinator must execute domain changes through CommandBus in ${rel}: ${forbiddenMutation}`
        );
      }
    }

    if (!text.includes("commands.dispatch(")) {
      failures.push(
        "OperationsExecutionCoordinator must execute operations through CommandBus"
      );
    }
  }

  if (rel.includes("/services/DispatchCenterProjection.ts")) {
    for (const forbiddenMutation of [
      ".save(",
      ".replace("
    ]) {
      if (text.includes(forbiddenMutation)) {
        failures.push(
          `DispatchCenterProjection must remain read-only in ${rel}: ${forbiddenMutation}`
        );
      }
    }

    for (const requiredSection of [
      "trips",
      "support",
      "vehicles",
      "drivers",
      "shortages",
      "summary"
    ]) {
      if (!text.includes(requiredSection)) {
        failures.push(
          `DispatchCenterProjection missing Stage 12 UI section in ${rel}: ${requiredSection}`
        );
      }
    }
  }

  if (rel.includes("/handlers/operations/registerOperationsQueries.ts") &&
      !text.includes('"operations.dispatchCenter"')) {
    failures.push(
      "Stage 12 operations.dispatchCenter query must remain registered"
    );
  }

  if (text.includes('"vehicle.purchase"')) {
    failures.push(
      `Removed direct vehicle.purchase command returned in ${rel}`
    );
  }

  if (text.includes("quotePurchase(")) {
    failures.push(
      `Removed direct vehicle purchase pricing API returned in ${rel}`
    );
  }

  if (rel.includes("/vehicle/OwnedVehicle.ts")) {
    for (const requiredStage13Field of [
      "configurationId:",
      "seatCapacity:",
      "energyCapacityUnits:"
    ]) {
      if (!text.includes(requiredStage13Field)) {
        failures.push(
          `OwnedVehicle missing Stage 13 concrete configuration field in ${rel}: ${requiredStage13Field}`
        );
      }
    }
  }

  if (rel.includes("/vehicle-market/VehicleConfiguration.ts") &&
      text.includes("modelId:")) {
    failures.push(
      "VehicleConfiguration must reference a VehicleVariant, not duplicate VehicleModel"
    );
  }

  if (rel.includes("/services/VehicleMarketProjection.ts")) {
    for (const forbiddenMutation of [".save(", ".replace("]) {
      if (text.includes(forbiddenMutation)) {
        failures.push(
          `VehicleMarketProjection must remain read-only in ${rel}: ${forbiddenMutation}`
        );
      }
    }
  }

  if (rel.includes("/handlers/vehicle-market/registerVehicleMarketHandlers.ts")) {
    for (const requiredCommand of [
      '"vehicleMarket.createConfiguration"',
      '"vehicleMarket.purchaseListing"'
    ]) {
      if (!text.includes(requiredCommand)) {
        failures.push(
          `Stage 13 vehicle market handler missing command in ${rel}: ${requiredCommand}`
        );
      }
    }
  }

  if (rel.includes("/repositories/RepositoryBundle.ts") &&
      !text.includes("vehicleMarket: VehicleMarketRepository")) {
    failures.push(
      "RepositoryBundle must expose the canonical Stage 13 VehicleMarketRepository"
    );
  }

  if (rel.includes("/services/DayOperationsPlanner.ts") &&
      !text.includes('"listed_for_sale"')) {
    failures.push(
      "Stage 14 listed_for_sale vehicles must be excluded from DayOperationsPlanner"
    );
  }

  if (rel.includes("/vehicle/VehicleStatus.ts") &&
      !text.includes('"listed_for_sale"')) {
    failures.push(
      "Stage 14 VehicleStatus must retain listed_for_sale"
    );
  }

  if (rel.includes("/handlers/vehicle-market/registerVehicleMarketHandlers.ts")) {
    for (const requiredStage14Command of [
      '"vehicleMarket.listOwnedVehicle"',
      '"vehicleMarket.sellToDealer"',
      '"vehicleMarket.withdrawListing"',
      '"vehicleMarket.inspectListing"',
      '"vehicleMarket.negotiateListing"',
      '"vehicleMarket.startAuction"',
      '"vehicleMarket.placeAuctionBid"',
      '"vehicleMarket.settleAuction"'
    ]) {
      if (!text.includes(requiredStage14Command)) {
        failures.push(
          `Stage 14 vehicle market handler missing command in ${rel}: ${requiredStage14Command}`
        );
      }
    }
  }

  if (rel.includes("/services/VehicleMarketTradingService.ts") &&
      !text.includes("VEHICLE_MODEL_LOCKED")) {
    failures.push(
      "Stage 15 market purchases must enforce vehicle content unlocks"
    );
  }

  if (rel.includes("/services/VehicleContentAccessService.ts")) {
    for (const requiredStage15Token of [
      "VEHICLE_SERIES",
      "vehicleUnlockRuleForTier",
      "ownedVehicleCount"
    ]) {
      if (!text.includes(requiredStage15Token)) {
        failures.push(
          `VehicleContentAccessService missing Stage 15 progression rule: ${requiredStage15Token}`
        );
      }
    }
  }

  if (rel.includes("/content/vehicle/VehicleModelCatalog.ts")) {
    const formalModelCount = text.split("model({").length - 1;
    if (formalModelCount !== 100) {
      failures.push(
        `Stage 15 VehicleModelCatalog must contain exactly 100 formal models, found ${formalModelCount}`
      );
    }
    if (!text.includes('"electric_wh"')) {
      failures.push(
        "Stage 15 VehicleModelCatalog must retain electric vehicle content"
      );
    }
  }

  if (rel.includes("/content/vehicle/VehicleContentValidator.ts") &&
      !text.includes("SERIES_MODEL_COUNT_INCOMPLETE")) {
    failures.push(
      "Stage 15 validator must enforce complete per-series model counts"
    );
  }

  if (rel.includes("/content/vehicle/VehicleVariantCatalog.ts")) {
    if (!text.includes("Vehicle variant catalog must contain exactly 180 variants")) {
      failures.push(
        "Stage 15 VehicleVariantCatalog must enforce exactly 180 variants"
      );
    }
    for (const requiredVariantToken of [
      "basePriceCents",
      "standardSeatCapacity",
      "standardEnergyCapacityUnits",
      "standardLuggageCapacityL",
      "standardComfortPermille",
      "allowedOptionCodes",
      "launchGameDay",
      "productionEndGameDay",
      "dealerClearanceEndGameDay"
    ]) {
      if (!text.includes(requiredVariantToken)) {
        failures.push(
          `Stage 15 VehicleVariantCatalog missing formal variant field: ${requiredVariantToken}`
        );
      }
    }
  }

  if (rel.includes("/content/vehicle/VehicleOptionCodes.ts") &&
      !text.includes("exactly 48 codes")) {
    failures.push(
      "Stage 15 VehicleOptionCodes must enforce exactly 48 stable option codes"
    );
  }

  if (rel.includes("/finance/FinancialProfiles.ts")) {
    for (const forbiddenField of [
      "energyKind:",
      "drivingEnergyUnitsPer100Km:",
      "idleEnergyUnitsPerHour:"
    ]) {
      if (text.includes(forbiddenField)) {
        failures.push(
          `Finance profile owns vehicle technical data in ${rel}: ${forbiddenField}`
        );
      }
    }
  }

  if (rel.includes("/trip/TripPosition.ts") && text.includes("worldPosition:")) {
    failures.push(
      "TripPosition must store road progress, not derived worldPosition"
    );
  }

  if (rel.includes("/trip/TripInstance.ts")) {
    if (text.includes("onboardPassengerCount:")) {
      failures.push(
        "TripInstance must use destination groups, not a duplicate onboard count"
      );
    }
    if (!text.includes("onboardPassengerGroups:")) {
      failures.push(
        "TripInstance must own onboard passenger destination groups"
      );
    }
  }

  if (rel.includes("/route/PassengerRoute.ts")) {
    for (const forbiddenField of [
      "vehicleId:",
      "driverId:",
      "passengerCount:",
      "worldPosition:",
      "roadPathSegmentIds:",
      "orderedStationIds:"
    ]) {
      if (text.includes(forbiddenField)) {
        failures.push(
          `Route runtime/legacy ownership violation in ${rel}: ${forbiddenField}`
        );
      }
    }

    if (!text.includes("pathLegs:") || !text.includes("stopPoints:")) {
      failures.push(
        "PassengerRoute must use pathLegs plus canonical stopPoints"
      );
    }
  }
}

if (failures.length > 0) {
  console.error("ARCHITECTURE_CHECK_FAILED");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("ARCHITECTURE_CHECK_OK");
