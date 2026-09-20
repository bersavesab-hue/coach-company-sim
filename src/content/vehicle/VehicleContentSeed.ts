import { VEHICLE_BRANDS } from "./VehicleBrandCatalog.js";
import { VEHICLE_DEALERS } from "./VehicleDealerCatalog.js";
import { VEHICLE_MODELS } from "./VehicleModelCatalog.js";
import { VEHICLE_OPTIONS } from "./VehicleOptionCatalog.js";
import { VEHICLE_SERIES } from "./VehicleSeriesCatalog.js";
import { VEHICLE_VARIANTS } from "./VehicleVariantCatalog.js";

export const FORMAL_VEHICLE_CONTENT = {
  brands: VEHICLE_BRANDS.map((record) => record.brand),
  series: VEHICLE_SERIES.map((record) => record.series),
  models: VEHICLE_MODELS.map((record) => record.model),
  modelIdentities: VEHICLE_MODELS.map(
    (record) => record.identity
  ),
  variants: VEHICLE_VARIANTS.map(
    (record) => record.variant
  ),
  options: VEHICLE_OPTIONS,
  dealers: VEHICLE_DEALERS.map(
    (record) => record.dealer
  )
} as const;
