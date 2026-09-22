import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import sharp from "sharp";
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

const mapViewConfigPath = path.resolve(
  "presentation/apk/map-view.v1.json"
);
if (!fs.existsSync(mapViewConfigPath)) {
  throw new Error(
    "Formal map view config is missing; refusing to build playable APK."
  );
}
const mapViewConfig = JSON.parse(
  fs.readFileSync(
    mapViewConfigPath,
    "utf8"
  )
) as {
  viewBox: {
    width: number;
    height: number;
  };
  camera: {
    defaultRatio: number;
    minRatio: number;
  };
  lod: Array<{
    detail: number;
    minCameraRatio: number;
  }>;
  terrain: {
    source: {
      width: number;
      height: number;
    };
    levels: Array<{
      level: number;
      cols: number;
      rows: number;
      width: number;
      height: number;
      maxDetail: number;
    }>;
  };
};
fs.copyFileSync(
  mapViewConfigPath,
  path.join(
    outputDir,
    "map-view.v1.json"
  )
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

const terrainMetadata = await sharp(
  terrainAsset
).metadata();
if (
  terrainMetadata.width !==
    mapViewConfig.terrain.source.width ||
  terrainMetadata.height !==
    mapViewConfig.terrain.source.height
) {
  throw new Error(
    `Formal base terrain dimensions do not match map-view.v1.json: ${terrainMetadata.width}x${terrainMetadata.height}.`
  );
}

const terrainPyramidDir = path.join(
  outputDir,
  "assets/map/terrain"
);
fs.rmSync(terrainPyramidDir, {
  recursive: true,
  force: true
});
fs.mkdirSync(terrainPyramidDir, {
  recursive: true
});

let generatedTerrainTiles = 0;
for (
  const config of
    mapViewConfig.terrain.levels
) {
  if (
    config.width % config.cols !== 0 ||
    config.height % config.rows !== 0
  ) {
    throw new Error(
      `Terrain level z${config.level} dimensions must divide evenly into tiles.`
    );
  }

  const levelDir = path.join(
    terrainPyramidDir,
    `z${config.level}`
  );
  fs.mkdirSync(levelDir, {
    recursive: true
  });

  const source =
    config.width ===
      mapViewConfig.terrain.source.width &&
    config.height ===
      mapViewConfig.terrain.source.height
      ? await fs.promises.readFile(
          terrainAsset
        )
      : await sharp(terrainAsset)
          .resize(
            config.width,
            config.height,
            {
              fit: "fill",
              kernel: sharp.kernel.lanczos3
            }
          )
          .webp({
            quality: 84,
            smartSubsample: true
          })
          .toBuffer();

  const tileWidth =
    config.width / config.cols;
  const tileHeight =
    config.height / config.rows;

  for (
    let row = 0;
    row < config.rows;
    row += 1
  ) {
    for (
      let col = 0;
      col < config.cols;
      col += 1
    ) {
      await sharp(source)
        .extract({
          left: col * tileWidth,
          top: row * tileHeight,
          width: tileWidth,
          height: tileHeight
        })
        .webp({
          quality: 84,
          smartSubsample: true
        })
        .toFile(
          path.join(
            levelDir,
            `${col}-${row}.webp`
          )
        );
      generatedTerrainTiles += 1;
    }
  }
}

const expectedTerrainTiles =
  mapViewConfig.terrain.levels.reduce(
    (total, level) =>
      total + level.cols * level.rows,
    0
  );
if (
  generatedTerrainTiles !==
  expectedTerrainTiles
) {
  throw new Error(
    `Unexpected terrain tile count: ${generatedTerrainTiles}/${expectedTerrainTiles}.`
  );
}

fs.rmSync(
  path.join(
    outputDir,
    "assets/map/base-terrain.webp"
  ),
  { force: true }
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
