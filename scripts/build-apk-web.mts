import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import {
  validateStage15VehicleContent
} from "../src/content/vehicle/VehicleStage15Validator.js";
import {
  validateFormalWorldMapContent
} from "../src/content/map/FormalWorldMapContent.js";

const mapValidation = validateFormalWorldMapContent();
if (!mapValidation.valid) {
  throw new Error(
    `Formal world map content is invalid; refusing to build playable APK.\n${mapValidation.issues.join("\n")}`
  );
}

const validation = validateStage15VehicleContent();
if (!validation.valid) {
  throw new Error(
    "Formal vehicle content is invalid; refusing to build playable APK."
  );
}

const outputDir = path.resolve(
  "android-app/app/src/main/assets/www"
);
fs.rmSync(outputDir, {
  recursive: true,
  force: true
});
fs.mkdirSync(outputDir, { recursive: true });

fs.copyFileSync(
  path.resolve(
    "presentation/apk/index.template.html"
  ),
  path.join(outputDir, "index.html")
);

const apkAssetSourceDir = path.resolve(
  "presentation/apk/assets"
);
const terrainAsset = path.join(
  apkAssetSourceDir,
  "map/base-terrain.webp"
);
if (!fs.existsSync(terrainAsset)) {
  throw new Error(
    "Formal base terrain asset is missing; refusing to build playable APK."
  );
}
fs.cpSync(
  apkAssetSourceDir,
  path.join(outputDir, "assets"),
  { recursive: true }
);

await build({
  entryPoints: [
    "src/presentation/android/PlayableClient.ts"
  ],
  outfile: path.join(outputDir, "game.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome110"],
  minify: true,
  sourcemap: false,
  logLevel: "info"
});

console.log(
  "APK_PLAYABLE_CLIENT_READY"
);
