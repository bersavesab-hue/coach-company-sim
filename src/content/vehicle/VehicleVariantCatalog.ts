import { ids } from "../../contracts/ids/EntityIds.js";
import { units } from "../../core/units/Units.js";
import type {
  VehicleModelContentRecord,
  VehicleVariantContentRecord
} from "./VehicleContentTypes.js";
import { VEHICLE_MODELS } from "./VehicleModelCatalog.js";
import {
  VEHICLE_OPTION_CODES,
  type VehicleOptionCode
} from "./VehicleOptionCodes.js";

const THREE_VARIANT_MODEL_KEYS = new Set<string>([
  "hanvo_a12",
  "jincheng_v12",
  "norsen_r12",
  "norsen_r13",
  "norsen_r14",
  "norsen_x13",
  "norsen_x14",
  "velmann_c12",
  "velmann_c13",
  "velmann_g13",
  "velmann_g14",
  "xinglv_p11",
  "xinglv_p12",
  "xinglv_p13",
  "xinglv_x11",
  "xinglv_x12",
  "xinglv_x13",
  "yusheng_x11",
  "yusheng_x12",
  "yusheng_x13"
]);

const TWO_VARIANT_MODEL_KEYS = new Set<string>([
  "hanvo_a11",
  "hanvo_h10",
  "hanvo_h12",
  "hanvo_r12",
  "hanvo_r13",
  "jiangchi_c10",
  "jincheng_g10",
  "jincheng_l10",
  "jincheng_l11",
  "jincheng_l12",
  "jincheng_l9",
  "jincheng_v10",
  "jincheng_v11",
  "norsen_n11",
  "norsen_n12",
  "tojima_c8",
  "tojima_c9",
  "velmann_c11",
  "velmann_t11",
  "velmann_t12",
  "velmann_t13",
  "xinglv_t10",
  "xinglv_t11",
  "xinglv_t12",
  "xinglv_t9",
  "yunchi_e12",
  "yunchi_ex10",
  "yunchi_ex11",
  "yunchi_ex12",
  "yunchi_ex13",
  "yusheng_k10",
  "yusheng_k11",
  "yusheng_k12",
  "yusheng_k13",
  "yusheng_k9",
  "zhongheng_k11",
  "zhongheng_t10",
  "zhongheng_t11",
  "zhongheng_t12",
  "zhongheng_t9"
]);

const ROLE_BASE_PRICE_YUAN = {
  rural_minibus: 120_000,
  county_midibus: 210_000,
  standard_coach: 420_000,
  intercity_coach: 620_000,
  premium_coach: 980_000,
  tourist_coach: 720_000,
  airport_shuttle: 360_000,
  high_capacity_coach: 1_080_000
} as const;

const BRAND_PRICE_PERMILLE: Readonly<Record<string, number>> = {
  jiangchi: 850,
  zhongheng: 910,
  jincheng: 1000,
  yusheng: 1080,
  yunchi: 1180,
  xinglv: 1280,
  hanvo: 1280,
  tojima: 1380,
  norsen: 1880,
  velmann: 2050
};

export const VEHICLE_VARIANTS: readonly VehicleVariantContentRecord[] =
  VEHICLE_MODELS.flatMap((record) =>
    createVariants(
      record,
      variantCountForModel(record)
    )
  );

function variantCountForModel(
  record: VehicleModelContentRecord
): 1 | 2 | 3 {
  const key = modelKey(record);
  if (THREE_VARIANT_MODEL_KEYS.has(key)) return 3;
  if (TWO_VARIANT_MODEL_KEYS.has(key)) return 2;
  return 1;
}

function modelKey(record: VehicleModelContentRecord): string {
  return String(record.model.id).slice("vehicle_model.".length);
}

function createVariants(
  record: VehicleModelContentRecord,
  count: 1 | 2 | 3
): readonly VehicleVariantContentRecord[] {
  const result: VehicleVariantContentRecord[] = [];
  const key = modelKey(record);

  for (let editionIndex = 0; editionIndex < count; editionIndex += 1) {
    const modelYear =
      record.identity.productionStartYear + editionIndex;
    const variantKind =
      editionIndex === 0
        ? "standard"
        : editionIndex === 1
          ? secondaryVariantKind(record)
          : tertiaryVariantKind(record);
    const launchGameDay =
      record.metadata.unlock.earliestGameDay +
      editionIndex * 90;
    const nextLaunch =
      editionIndex < count - 1
        ? record.metadata.unlock.earliestGameDay +
          (editionIndex + 1) * 90
        : null;
    const productionEndGameDay =
      nextLaunch === null ? null : nextLaunch + 30;

    result.push({
      variant: {
        id: ids.vehicleVariant(
          `vehicle_variant.${key}.${modelYear}.${variantKind}`
        ),
        modelId: record.model.id,
        name: `${modelYear}款 ${variantDisplayName(
          record,
          editionIndex
        )}`,
        modelYear,
        basePriceCents: units.moneyCents(
          calculateBasePriceCents(record, editionIndex)
        ),
        standardSeatCapacity: standardSeatCapacity(
          record,
          editionIndex
        ),
        standardEnergyCapacityUnits:
          standardEnergyCapacityUnits(
            record,
            editionIndex
          ),
        standardLuggageCapacityL:
          standardLuggageCapacityL(
            record,
            editionIndex
          ),
        standardComfortPermille:
          standardComfortPermille(
            record,
            editionIndex
          ),
        allowedOptionCodes: allowedOptionCodes(
          record,
          editionIndex
        ),
        active: true
      },
      lifecycle: {
        variantId: ids.vehicleVariant(
          `vehicle_variant.${key}.${modelYear}.${variantKind}`
        ),
        launchGameDay,
        productionEndGameDay,
        dealerClearanceEndGameDay:
          productionEndGameDay === null
            ? null
            : productionEndGameDay + 45
      }
    });
  }

  return result;
}

function brandKey(
  record: VehicleModelContentRecord
): string {
  return modelKey(record).split("_")[0] ?? "yusheng";
}

function calculateBasePriceCents(
  record: VehicleModelContentRecord,
  editionIndex: number
): number {
  const roleBase = ROLE_BASE_PRICE_YUAN[record.metadata.role];
  const brandPermille =
    BRAND_PRICE_PERMILLE[brandKey(record)] ?? 1000;
  const seatValue = record.model.seatCapacity * 4_200;
  const electricPremium =
    record.model.energyKind === "electric_wh"
      ? 220_000 +
        Math.floor(
          record.model.energyCapacityUnits / 1000
        ) * 380
      : 0;
  const yearPremium =
    Math.max(
      0,
      record.identity.productionStartYear - 2024
    ) * 12_000;
  const editionPermille =
    editionIndex === 0
      ? 1000
      : editionIndex === 1
        ? 1120
        : 1280;

  const yuan =
    Math.round(
      (
        ((roleBase + seatValue + electricPremium + yearPremium) *
          brandPermille) /
        1000
      ) *
      (editionPermille / 1000)
    );

  return yuan * 100;
}

function standardSeatCapacity(
  record: VehicleModelContentRecord,
  editionIndex: number
): number {
  const base = record.model.seatCapacity;
  if (editionIndex === 0) return base;

  const premiumReduction =
    record.metadata.role === "premium_coach" ||
    record.metadata.role === "tourist_coach"
      ? editionIndex === 1 ? 3 : 5
      : record.metadata.role === "intercity_coach" ||
          record.metadata.role === "airport_shuttle"
        ? editionIndex === 1 ? 2 : 4
        : editionIndex === 1 ? 1 : 2;

  return Math.max(8, base - premiumReduction);
}

function standardEnergyCapacityUnits(
  record: VehicleModelContentRecord,
  editionIndex: number
): number {
  const base = record.model.energyCapacityUnits;
  const multiplier =
    editionIndex === 0
      ? 1000
      : record.model.energyKind === "electric_wh"
        ? editionIndex === 1 ? 1150 : 1280
        : editionIndex === 1 ? 1080 : 1150;

  return Math.round((base * multiplier) / 1000);
}

function standardLuggageCapacityL(
  record: VehicleModelContentRecord,
  editionIndex: number
): number {
  const baseByRole = {
    rural_minibus: 500,
    county_midibus: 900,
    standard_coach: 1_700,
    intercity_coach: 2_700,
    premium_coach: 3_300,
    tourist_coach: 3_900,
    airport_shuttle: 2_800,
    high_capacity_coach: 4_200
  } as const;

  const editionBonus =
    editionIndex === 0 ? 0 : editionIndex === 1 ? 350 : 700;

  return (
    baseByRole[record.metadata.role] +
    record.model.seatCapacity * 20 +
    editionBonus
  );
}

function standardComfortPermille(
  record: VehicleModelContentRecord,
  editionIndex: number
): number {
  const baseByRole = {
    rural_minibus: 330,
    county_midibus: 390,
    standard_coach: 470,
    intercity_coach: 550,
    premium_coach: 710,
    tourist_coach: 630,
    airport_shuttle: 590,
    high_capacity_coach: 540
  } as const;

  const brandBonus: Readonly<Record<string, number>> = {
    jiangchi: -30,
    zhongheng: 0,
    jincheng: 20,
    yusheng: 35,
    yunchi: 45,
    xinglv: 90,
    hanvo: 55,
    tojima: 70,
    norsen: 110,
    velmann: 130
  };

  const editionBonus =
    editionIndex === 0 ? 0 : editionIndex === 1 ? 75 : 145;

  return Math.min(
    950,
    baseByRole[record.metadata.role] +
      (brandBonus[brandKey(record)] ?? 0) +
      editionBonus
  );
}

function secondaryVariantKind(
  record: VehicleModelContentRecord
): string {
  if (record.model.energyKind === "electric_wh") {
    return "long_range";
  }
  switch (record.metadata.role) {
    case "premium_coach":
      return "luxury";
    case "tourist_coach":
      return "touring";
    case "intercity_coach":
      return "long_distance";
    case "airport_shuttle":
      return "business";
    case "high_capacity_coach":
      return "capacity";
    default:
      return "comfort";
  }
}

function tertiaryVariantKind(
  record: VehicleModelContentRecord
): string {
  if (record.model.energyKind === "electric_wh") {
    return "flagship_range";
  }
  switch (record.metadata.role) {
    case "premium_coach":
      return "flagship";
    case "tourist_coach":
      return "premium_touring";
    case "intercity_coach":
      return "premium_long_distance";
    case "airport_shuttle":
      return "premium_business";
    case "high_capacity_coach":
      return "flagship_capacity";
    default:
      return "premium";
  }
}

function variantDisplayName(
  record: VehicleModelContentRecord,
  editionIndex: number
): string {
  if (editionIndex === 0) return "标准版";
  if (record.model.energyKind === "electric_wh") {
    return editionIndex === 1
      ? "长续航版"
      : "旗舰长续航版";
  }

  switch (record.metadata.role) {
    case "premium_coach":
      return editionIndex === 1 ? "豪华版" : "旗舰版";
    case "tourist_coach":
      return editionIndex === 1 ? "旅游版" : "尊享旅游版";
    case "intercity_coach":
      return editionIndex === 1 ? "长途版" : "豪华长途版";
    case "airport_shuttle":
      return editionIndex === 1 ? "商务版" : "尊享商务版";
    case "high_capacity_coach":
      return editionIndex === 1 ? "高运力版" : "旗舰高运力版";
    default:
      return editionIndex === 1 ? "舒适版" : "高配版";
  }
}

function allowedOptionCodes(
  record: VehicleModelContentRecord,
  editionIndex: number
): readonly VehicleOptionCode[] {
  const codes = new Set<VehicleOptionCode>([
    "seat_standard",
    "seat_comfort",
    "energy_standard",
    "energy_long_range",
    "luggage_standard",
    "luggage_large",
    "climate_standard",
    "climate_hot_region",
    "climate_cold_region",
    "comfort_usb",
    "comfort_recline",
    "safety_basic",
    "safety_esc",
    "safety_tire_monitor",
    "service_basic",
    "service_power_outlet",
    "operation_standard_livery",
    "operation_led_destination",
    "operation_fleet_telematics"
  ]);

  if (
    record.metadata.role === "rural_minibus" ||
    record.metadata.role === "county_midibus" ||
    record.metadata.role === "high_capacity_coach"
  ) {
    codes.add("seat_dense");
  }

  if (
    record.metadata.role === "premium_coach" ||
    record.metadata.role === "tourist_coach" ||
    record.metadata.role === "airport_shuttle"
  ) {
    codes.add("seat_business");
    codes.add("seat_space");
    codes.add("comfort_leg_rest");
    codes.add("comfort_quiet");
    codes.add("comfort_wifi");
    codes.add("climate_dual_zone");
    codes.add("climate_premium");
    codes.add("operation_premium_paint");
  }

  if (record.metadata.role === "tourist_coach") {
    codes.add("luggage_tourism");
    codes.add("service_entertainment");
    codes.add("service_refrigerator");
    codes.add("service_hot_water");
    codes.add("service_toilet");
  }

  if (record.metadata.role === "airport_shuttle") {
    codes.add("luggage_airport");
    codes.add("operation_accessibility");
    codes.add("seat_accessible");
  }

  if (
    record.metadata.role === "intercity_coach" ||
    record.metadata.role === "high_capacity_coach"
  ) {
    codes.add("energy_intercity");
    codes.add("luggage_high_roof");
    codes.add("comfort_sleep_support");
  }

  if (record.model.energyKind === "electric_wh") {
    codes.add("energy_ultra_range");
    codes.add("energy_cold_weather");
    codes.add("climate_heat_pump");
  } else {
    codes.add("energy_lightweight");
  }

  if (editionIndex >= 1) {
    codes.add("safety_lane_warning");
    codes.add("safety_collision_warning");
    codes.add("safety_driver_monitor");
  }

  return [...codes];
}

if (VEHICLE_VARIANTS.length !== 180) {
  throw new Error(
    `Vehicle variant catalog must contain exactly 180 variants, found ${VEHICLE_VARIANTS.length}`
  );
}
