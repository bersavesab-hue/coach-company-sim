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
      "offsetOnSegmentM:"
    ]) {
      if (text.includes(forbiddenField)) {
        failures.push(
          `Vehicle runtime ownership violation in ${rel}: ${forbiddenField}`
        );
      }
    }
  }

  if (rel.includes("/trip/TripPosition.ts")) {
    if (text.includes("worldPosition:")) {
      failures.push(
        "TripPosition must store road progress, not derived worldPosition"
      );
    }
  }

  if (rel.includes("/route/PassengerRoute.ts")) {
    for (const forbiddenField of [
      "vehicleId:",
      "driverId:",
      "passengerCount:",
      "worldPosition:",
      "roadPathSegmentIds:"
    ]) {
      if (text.includes(forbiddenField)) {
        failures.push(
          `Route runtime/legacy ownership violation in ${rel}: ${forbiddenField}`
        );
      }
    }

    if (!text.includes("pathLegs:")) {
      failures.push("PassengerRoute must use direction-aware pathLegs");
    }
  }
}

if (failures.length > 0) {
  console.error("ARCHITECTURE_CHECK_FAILED");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("ARCHITECTURE_CHECK_OK");
