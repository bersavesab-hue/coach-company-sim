import { ids } from "../../contracts/ids/EntityIds.js";
import { units } from "../../core/units/Units.js";
import type { VehicleModelContentRecord, VehicleUnlockTier } from "./VehicleContentTypes.js";
import { vehicleUnlockRuleForTier } from "./VehicleUnlockRules.js";

function model(input: {
  readonly id: string;
  readonly series: string;
  readonly displayName: string;
  readonly role: VehicleModelContentRecord["metadata"]["role"];
  readonly tier: VehicleUnlockTier;
  readonly earliestGameDay?: number;
  readonly minimumReputationPermille?: number;
  readonly minimumOwnedVehicleCount?: number;
  readonly productionStartYear: number;
  readonly seatCapacity: number;
  readonly maxSpeedMps: number;
  readonly energyKind?: "diesel_ml" | "gasoline_ml" | "electric_wh" | "hydrogen_gram";
  readonly energyCapacityUnits: number;
  readonly minimumDispatchEnergyUnits: number;
  readonly drivingEnergyUnitsPer100Km: number;
  readonly idleEnergyUnitsPerHour: number;
  readonly serviceIntervalM: number;
  readonly powertrainWearPermillePer1000Km: number;
  readonly brakeWearPermillePer1000Km: number;
  readonly tireWearPermillePer1000Km: number;
}): VehicleModelContentRecord {
  const baseUnlock = vehicleUnlockRuleForTier(input.tier);
  const modelId = ids.vehicleModel(`vehicle_model.${input.id}`);
  const seriesId = ids.vehicleSeries(`vehicle_series.${input.series}`);

  return {
    model: {
      id: modelId,
      serviceClass: input.role,
      seatCapacity: input.seatCapacity,
      maxSpeedMps: units.speedMps(input.maxSpeedMps),
      energyKind: input.energyKind ?? "diesel_ml",
      energyCapacityUnits: input.energyCapacityUnits,
      minimumDispatchEnergyUnits: input.minimumDispatchEnergyUnits,
      drivingEnergyUnitsPer100Km: input.drivingEnergyUnitsPer100Km,
      idleEnergyUnitsPerHour: input.idleEnergyUnitsPerHour,
      serviceIntervalM: input.serviceIntervalM,
      powertrainWearPermillePer1000Km:
        input.powertrainWearPermillePer1000Km,
      brakeWearPermillePer1000Km:
        input.brakeWearPermillePer1000Km,
      tireWearPermillePer1000Km:
        input.tireWearPermillePer1000Km,
      minimumPowertrainConditionPermille: 500,
      minimumBrakeConditionPermille: 600,
      minimumTireConditionPermille: 600,
      active: true
    },
    identity: {
      modelId,
      seriesId,
      displayName: input.displayName,
      productionStartYear: input.productionStartYear,
      productionEndYear: null
    },
    metadata: {
      modelId,
      seriesId,
      displayName: input.displayName,
      role: input.role,
      unlock: {
        tier: input.tier,
        earliestGameDay:
          input.earliestGameDay ?? baseUnlock.earliestGameDay,
        minimumReputationPermille:
          input.minimumReputationPermille ??
          baseUnlock.minimumReputationPermille,
        minimumOwnedVehicleCount:
          input.minimumOwnedVehicleCount ??
          baseUnlock.minimumOwnedVehicleCount
      }
    }
  };
}

export const VEHICLE_MODELS: readonly VehicleModelContentRecord[] = [
  // 江驰 V：低成本乡镇微客。便宜耐造，能耗低，但保养间隔和高速能力一般。
  model({
    id: "jiangchi_v5",
    series: "jiangchi_v",
    displayName: "江驰 V5",
    role: "rural_minibus",
    tier: 1,
    productionStartYear: 2024,
    seatCapacity: 14,
    maxSpeedMps: 22,
    energyCapacityUnits: 65_000,
    minimumDispatchEnergyUnits: 7_000,
    drivingEnergyUnitsPer100Km: 11_500,
    idleEnergyUnitsPerHour: 1_250,
    serviceIntervalM: 12_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_v6",
    series: "jiangchi_v",
    displayName: "江驰 V6",
    role: "rural_minibus",
    tier: 1,
    earliestGameDay: 2,
    productionStartYear: 2024,
    seatCapacity: 17,
    maxSpeedMps: 23,
    energyCapacityUnits: 75_000,
    minimumDispatchEnergyUnits: 8_000,
    drivingEnergyUnitsPer100Km: 12_600,
    idleEnergyUnitsPerHour: 1_350,
    serviceIntervalM: 13_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_v6l",
    series: "jiangchi_v",
    displayName: "江驰 V6L",
    role: "rural_minibus",
    tier: 1,
    earliestGameDay: 3,
    minimumReputationPermille: 80,
    productionStartYear: 2025,
    seatCapacity: 19,
    maxSpeedMps: 23,
    energyCapacityUnits: 85_000,
    minimumDispatchEnergyUnits: 9_000,
    drivingEnergyUnitsPer100Km: 13_400,
    idleEnergyUnitsPerHour: 1_450,
    serviceIntervalM: 14_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_v7",
    series: "jiangchi_v",
    displayName: "江驰 V7",
    role: "rural_minibus",
    tier: 1,
    earliestGameDay: 4,
    minimumReputationPermille: 120,
    minimumOwnedVehicleCount: 1,
    productionStartYear: 2025,
    seatCapacity: 22,
    maxSpeedMps: 24,
    energyCapacityUnits: 95_000,
    minimumDispatchEnergyUnits: 10_000,
    drivingEnergyUnitsPer100Km: 14_300,
    idleEnergyUnitsPerHour: 1_550,
    serviceIntervalM: 15_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),

  // 江驰 M：县域中巴，继续强调维修便宜和道路适应性。
  model({
    id: "jiangchi_m6",
    series: "jiangchi_m",
    displayName: "江驰 M6",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 2,
    productionStartYear: 2024,
    seatCapacity: 20,
    maxSpeedMps: 23,
    energyCapacityUnits: 90_000,
    minimumDispatchEnergyUnits: 9_000,
    drivingEnergyUnitsPer100Km: 14_800,
    idleEnergyUnitsPerHour: 1_600,
    serviceIntervalM: 14_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_m7",
    series: "jiangchi_m",
    displayName: "江驰 M7",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 3,
    minimumReputationPermille: 80,
    productionStartYear: 2024,
    seatCapacity: 24,
    maxSpeedMps: 24,
    energyCapacityUnits: 110_000,
    minimumDispatchEnergyUnits: 11_000,
    drivingEnergyUnitsPer100Km: 16_200,
    idleEnergyUnitsPerHour: 1_750,
    serviceIntervalM: 15_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_m8",
    series: "jiangchi_m",
    displayName: "江驰 M8",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 5,
    minimumReputationPermille: 130,
    minimumOwnedVehicleCount: 1,
    productionStartYear: 2025,
    seatCapacity: 28,
    maxSpeedMps: 24,
    energyCapacityUnits: 130_000,
    minimumDispatchEnergyUnits: 13_000,
    drivingEnergyUnitsPer100Km: 18_000,
    idleEnergyUnitsPerHour: 1_900,
    serviceIntervalM: 16_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "jiangchi_m8l",
    series: "jiangchi_m",
    displayName: "江驰 M8L",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 6,
    minimumReputationPermille: 160,
    minimumOwnedVehicleCount: 2,
    productionStartYear: 2025,
    seatCapacity: 30,
    maxSpeedMps: 25,
    energyCapacityUnits: 145_000,
    minimumDispatchEnergyUnits: 15_000,
    drivingEnergyUnitsPer100Km: 18_800,
    idleEnergyUnitsPerHour: 2_000,
    serviceIntervalM: 17_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 5,
    tireWearPermillePer1000Km: 6
  }),

  // 宇盛 M：综合厂的中小型产品，价格后续偏高，但更省油、更耐久。
  model({
    id: "yusheng_m6",
    series: "yusheng_m",
    displayName: "宇盛 M6",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 2,
    productionStartYear: 2025,
    seatCapacity: 19,
    maxSpeedMps: 24,
    energyCapacityUnits: 90_000,
    minimumDispatchEnergyUnits: 9_000,
    drivingEnergyUnitsPer100Km: 13_900,
    idleEnergyUnitsPerHour: 1_450,
    serviceIntervalM: 18_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "yusheng_m7",
    series: "yusheng_m",
    displayName: "宇盛 M7",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 4,
    minimumReputationPermille: 120,
    minimumOwnedVehicleCount: 1,
    productionStartYear: 2025,
    seatCapacity: 24,
    maxSpeedMps: 25,
    energyCapacityUnits: 115_000,
    minimumDispatchEnergyUnits: 12_000,
    drivingEnergyUnitsPer100Km: 15_400,
    idleEnergyUnitsPerHour: 1_600,
    serviceIntervalM: 20_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "yusheng_m8",
    series: "yusheng_m",
    displayName: "宇盛 M8",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 6,
    minimumReputationPermille: 170,
    minimumOwnedVehicleCount: 2,
    productionStartYear: 2026,
    seatCapacity: 29,
    maxSpeedMps: 25,
    energyCapacityUnits: 140_000,
    minimumDispatchEnergyUnits: 14_000,
    drivingEnergyUnitsPer100Km: 17_200,
    idleEnergyUnitsPerHour: 1_800,
    serviceIntervalM: 22_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),

  // 宇盛 C：正式进入普通公路客运，Tier 2。
  model({
    id: "yusheng_c8",
    series: "yusheng_c",
    displayName: "宇盛 C8",
    role: "standard_coach",
    tier: 2,
    productionStartYear: 2025,
    seatCapacity: 31,
    maxSpeedMps: 25,
    energyCapacityUnits: 155_000,
    minimumDispatchEnergyUnits: 16_000,
    drivingEnergyUnitsPer100Km: 18_600,
    idleEnergyUnitsPerHour: 1_950,
    serviceIntervalM: 22_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "yusheng_c9",
    series: "yusheng_c",
    displayName: "宇盛 C9",
    role: "standard_coach",
    tier: 2,
    earliestGameDay: 6,
    minimumReputationPermille: 190,
    minimumOwnedVehicleCount: 3,
    productionStartYear: 2025,
    seatCapacity: 35,
    maxSpeedMps: 26,
    energyCapacityUnits: 175_000,
    minimumDispatchEnergyUnits: 18_000,
    drivingEnergyUnitsPer100Km: 20_400,
    idleEnergyUnitsPerHour: 2_100,
    serviceIntervalM: 24_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "yusheng_c10",
    series: "yusheng_c",
    displayName: "宇盛 C10",
    role: "standard_coach",
    tier: 2,
    earliestGameDay: 8,
    minimumReputationPermille: 220,
    minimumOwnedVehicleCount: 4,
    productionStartYear: 2026,
    seatCapacity: 39,
    maxSpeedMps: 27,
    energyCapacityUnits: 195_000,
    minimumDispatchEnergyUnits: 20_000,
    drivingEnergyUnitsPer100Km: 22_100,
    idleEnergyUnitsPerHour: 2_250,
    serviceIntervalM: 25_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),

  // 中衡 C：更强调购置性价比，技术参数略激进、维护频率略高。
  model({
    id: "zhongheng_c7",
    series: "zhongheng_c",
    displayName: "中衡 C7",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 2,
    productionStartYear: 2024,
    seatCapacity: 23,
    maxSpeedMps: 24,
    energyCapacityUnits: 105_000,
    minimumDispatchEnergyUnits: 11_000,
    drivingEnergyUnitsPer100Km: 15_800,
    idleEnergyUnitsPerHour: 1_700,
    serviceIntervalM: 16_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "zhongheng_c8",
    series: "zhongheng_c",
    displayName: "中衡 C8",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 4,
    minimumReputationPermille: 110,
    minimumOwnedVehicleCount: 1,
    productionStartYear: 2025,
    seatCapacity: 28,
    maxSpeedMps: 25,
    energyCapacityUnits: 130_000,
    minimumDispatchEnergyUnits: 13_000,
    drivingEnergyUnitsPer100Km: 17_500,
    idleEnergyUnitsPerHour: 1_850,
    serviceIntervalM: 17_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 6
  }),
  model({
    id: "zhongheng_c9",
    series: "zhongheng_c",
    displayName: "中衡 C9",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 6,
    minimumReputationPermille: 160,
    minimumOwnedVehicleCount: 2,
    productionStartYear: 2025,
    seatCapacity: 33,
    maxSpeedMps: 26,
    energyCapacityUnits: 155_000,
    minimumDispatchEnergyUnits: 16_000,
    drivingEnergyUnitsPer100Km: 19_600,
    idleEnergyUnitsPerHour: 2_050,
    serviceIntervalM: 18_000_000,
    powertrainWearPermillePer1000Km: 4,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 6
  }),

  // 金程 J：老牌耐久取向，中巴里油耗不算最低，但保养周期最长。
  model({
    id: "jincheng_j7",
    series: "jincheng_j",
    displayName: "金程 J7",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 3,
    productionStartYear: 2024,
    seatCapacity: 23,
    maxSpeedMps: 24,
    energyCapacityUnits: 115_000,
    minimumDispatchEnergyUnits: 12_000,
    drivingEnergyUnitsPer100Km: 16_400,
    idleEnergyUnitsPerHour: 1_700,
    serviceIntervalM: 21_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "jincheng_j8",
    series: "jincheng_j",
    displayName: "金程 J8",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 5,
    minimumReputationPermille: 140,
    minimumOwnedVehicleCount: 1,
    productionStartYear: 2025,
    seatCapacity: 28,
    maxSpeedMps: 25,
    energyCapacityUnits: 140_000,
    minimumDispatchEnergyUnits: 14_000,
    drivingEnergyUnitsPer100Km: 18_100,
    idleEnergyUnitsPerHour: 1_900,
    serviceIntervalM: 23_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  }),
  model({
    id: "jincheng_j9",
    series: "jincheng_j",
    displayName: "金程 J9",
    role: "county_midibus",
    tier: 1,
    earliestGameDay: 7,
    minimumReputationPermille: 180,
    minimumOwnedVehicleCount: 2,
    productionStartYear: 2026,
    seatCapacity: 33,
    maxSpeedMps: 26,
    energyCapacityUnits: 165_000,
    minimumDispatchEnergyUnits: 17_000,
    drivingEnergyUnitsPer100Km: 20_000,
    idleEnergyUnitsPerHour: 2_050,
    serviceIntervalM: 25_000_000,
    powertrainWearPermillePer1000Km: 3,
    brakeWearPermillePer1000Km: 4,
    tireWearPermillePer1000Km: 5
  })
];
