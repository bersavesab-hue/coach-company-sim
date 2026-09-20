import fs from "node:fs";
import path from "node:path";

import {
  GAME_VERSION,
  CONTENT_VERSION
} from "../src/core/version/Versions.js";
import { VEHICLE_BRANDS } from "../src/content/vehicle/VehicleBrandCatalog.js";
import { VEHICLE_SERIES } from "../src/content/vehicle/VehicleSeriesCatalog.js";
import { VEHICLE_MODELS } from "../src/content/vehicle/VehicleModelCatalog.js";
import { VEHICLE_VARIANTS } from "../src/content/vehicle/VehicleVariantCatalog.js";
import { VEHICLE_DEALERS } from "../src/content/vehicle/VehicleDealerCatalog.js";
import {
  VEHICLE_MARKET_ZONE_DEMAND_PROFILES
} from "../src/content/vehicle/VehicleMarketDemandCatalog.js";
import {
  validateStage15VehicleContent
} from "../src/content/vehicle/VehicleStage15Validator.js";

const validation = validateStage15VehicleContent();
if (!validation.valid) {
  const errors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map(
      (issue) =>
        `${issue.source}:${issue.code}:${issue.ref ?? "-"}`
    )
    .join("\n");
  throw new Error(
    `Stage 15 content is invalid; APK presentation cannot be built.\n${errors}`
  );
}

const seriesById = new Map(
  VEHICLE_SERIES.map((record) => [
    String(record.series.id),
    record
  ])
);
const brandById = new Map(
  VEHICLE_BRANDS.map((record) => [
    String(record.brand.id),
    record
  ])
);
const variantCountByModel = new Map<string, number>();
for (const record of VEHICLE_VARIANTS) {
  const key = String(record.variant.modelId);
  variantCountByModel.set(
    key,
    (variantCountByModel.get(key) ?? 0) + 1
  );
}

const payload = {
  version: GAME_VERSION,
  contentVersion: CONTENT_VERSION,
  counts: validation.counts,
  brands: VEHICLE_BRANDS.map((record) => ({
    id: String(record.brand.id),
    name: record.brand.name,
    latinName: record.latinName,
    origin: record.origin,
    positioning: record.positioning,
    seriesCount: VEHICLE_SERIES.filter(
      (series) =>
        series.series.brandId === record.brand.id
    ).length
  })),
  models: VEHICLE_MODELS.map((record) => {
    const series = seriesById.get(
      String(record.identity.seriesId)
    );
    const brand = series
      ? brandById.get(String(series.series.brandId))
      : undefined;
    return {
      id: String(record.model.id),
      name: record.identity.displayName,
      brand: brand?.brand.name ?? "未知品牌",
      series: series?.series.name ?? "未知车系",
      role: record.metadata.role,
      tier: record.metadata.unlock.tier,
      earliestGameDay:
        record.metadata.unlock.earliestGameDay,
      minimumReputationPermille:
        record.metadata.unlock.minimumReputationPermille,
      minimumOwnedVehicleCount:
        record.metadata.unlock.minimumOwnedVehicleCount,
      seatCapacity: record.model.seatCapacity,
      maxSpeedKph: Math.round(
        Number(record.model.maxSpeedMps) * 3.6
      ),
      energyKind: record.model.energyKind,
      energyCapacityUnits:
        record.model.energyCapacityUnits,
      drivingEnergyUnitsPer100Km:
        record.model.drivingEnergyUnitsPer100Km,
      serviceIntervalKm:
        Math.round(record.model.serviceIntervalM / 1000),
      variantCount:
        variantCountByModel.get(
          String(record.model.id)
        ) ?? 0
    };
  }),
  dealers: VEHICLE_DEALERS.map((record) => ({
    id: String(record.dealer.id),
    name: record.dealer.name,
    kind: record.dealer.kind,
    zone: record.marketZoneCode,
    inventoryProfile: record.inventoryProfile,
    brands: record.dealer.supportedBrandIds
      .map(
        (id) =>
          brandById.get(String(id))?.brand.name
      )
      .filter(
        (value): value is string =>
          value !== undefined
      ),
    newStockWeightPermille:
      record.newStockWeightPermille,
    usedSupplyWeightPermille:
      record.usedSupplyWeightPermille,
    priceBiasPermille:
      record.priceBiasPermille
  })),
  zones: VEHICLE_MARKET_ZONE_DEMAND_PROFILES
};

const templatePath = path.resolve(
  "presentation/apk/index.template.html"
);
const outputDir = path.resolve(
  "android-app/app/src/main/assets/www"
);
const serialized = JSON.stringify(payload)
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e")
  .replaceAll("&", "\\u0026");

const template = fs.readFileSync(
  templatePath,
  "utf8"
);
const html = template.replace(
  "__APP_DATA__",
  serialized
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "index.html"),
  html,
  "utf8"
);

console.log(
  `APK_WEB_READY ${payload.models.length} models / ${payload.dealers.length} dealers / v${payload.version}`
);
