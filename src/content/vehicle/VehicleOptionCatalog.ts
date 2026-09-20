import { units } from "../../core/units/Units.js";
import type { VehicleOptionDefinition } from "../../domain/vehicle-market/VehicleOptionDefinition.js";
import {
  ALL_VEHICLE_OPTION_CODES,
  type VehicleOptionCode
} from "./VehicleOptionCodes.js";

function option(input: {
  readonly code: VehicleOptionCode;
  readonly name: string;
  readonly priceYuan: number;
  readonly seatCapacityDelta?: number;
  readonly energyCapacityUnitsDelta?: number;
  readonly luggageCapacityLDelta?: number;
  readonly comfortPermilleDelta?: number;
  readonly mutuallyExclusiveGroup?: string | null;
}): VehicleOptionDefinition {
  return {
    code: input.code,
    name: input.name,
    priceDeltaCents: units.moneyCents(input.priceYuan * 100),
    seatCapacityDelta: input.seatCapacityDelta ?? 0,
    energyCapacityUnitsDelta:
      input.energyCapacityUnitsDelta ?? 0,
    luggageCapacityLDelta:
      input.luggageCapacityLDelta ?? 0,
    comfortPermilleDelta:
      input.comfortPermilleDelta ?? 0,
    mutuallyExclusiveGroup:
      input.mutuallyExclusiveGroup ?? null,
    active: true
  };
}

export const VEHICLE_OPTIONS: readonly VehicleOptionDefinition[] = [
  // 1. 座椅布局：同一辆车只能选择一种正式座椅布局。
  option({
    code: "seat_dense",
    name: "高密度座椅布局",
    priceYuan: 8_000,
    seatCapacityDelta: 4,
    comfortPermilleDelta: -10,
    mutuallyExclusiveGroup: "seat_layout"
  }),
  option({
    code: "seat_standard",
    name: "标准座椅布局",
    priceYuan: 0,
    mutuallyExclusiveGroup: "seat_layout"
  }),
  option({
    code: "seat_comfort",
    name: "舒适座椅布局",
    priceYuan: 26_000,
    seatCapacityDelta: -2,
    comfortPermilleDelta: 4,
    mutuallyExclusiveGroup: "seat_layout"
  }),
  option({
    code: "seat_business",
    name: "商务座椅布局",
    priceYuan: 68_000,
    seatCapacityDelta: -6,
    comfortPermilleDelta: 8,
    mutuallyExclusiveGroup: "seat_layout"
  }),
  option({
    code: "seat_space",
    name: "低座位大空间布局",
    priceYuan: 42_000,
    seatCapacityDelta: -4,
    comfortPermilleDelta: 6,
    mutuallyExclusiveGroup: "seat_layout"
  }),
  option({
    code: "seat_accessible",
    name: "无障碍座椅布局",
    priceYuan: 38_000,
    seatCapacityDelta: -2,
    luggageCapacityLDelta: -120,
    comfortPermilleDelta: 2,
    mutuallyExclusiveGroup: "seat_layout"
  }),

  // 2. 能源/续航：容量单位沿用对应车型 energyKind。
  option({
    code: "energy_standard",
    name: "标准续航包",
    priceYuan: 0,
    mutuallyExclusiveGroup: "energy_package"
  }),
  option({
    code: "energy_long_range",
    name: "长续航包",
    priceYuan: 34_000,
    energyCapacityUnitsDelta: 30_000,
    mutuallyExclusiveGroup: "energy_package"
  }),
  option({
    code: "energy_ultra_range",
    name: "超长续航包",
    priceYuan: 72_000,
    energyCapacityUnitsDelta: 60_000,
    mutuallyExclusiveGroup: "energy_package"
  }),
  option({
    code: "energy_lightweight",
    name: "轻量化能源包",
    priceYuan: 18_000,
    energyCapacityUnitsDelta: -15_000,
    luggageCapacityLDelta: 120,
    mutuallyExclusiveGroup: "energy_package"
  }),
  option({
    code: "energy_intercity",
    name: "城际续航包",
    priceYuan: 48_000,
    energyCapacityUnitsDelta: 40_000,
    mutuallyExclusiveGroup: "energy_package"
  }),
  option({
    code: "energy_cold_weather",
    name: "寒区续航包",
    priceYuan: 44_000,
    energyCapacityUnitsDelta: 20_000,
    mutuallyExclusiveGroup: "energy_package"
  }),

  // 3. 行李方案。
  option({
    code: "luggage_standard",
    name: "标准行李舱",
    priceYuan: 0,
    mutuallyExclusiveGroup: "luggage_package"
  }),
  option({
    code: "luggage_large",
    name: "加大行李舱",
    priceYuan: 22_000,
    luggageCapacityLDelta: 600,
    mutuallyExclusiveGroup: "luggage_package"
  }),
  option({
    code: "luggage_tourism",
    name: "旅游大行李舱",
    priceYuan: 36_000,
    luggageCapacityLDelta: 1_200,
    comfortPermilleDelta: 2,
    mutuallyExclusiveGroup: "luggage_package"
  }),
  option({
    code: "luggage_airport",
    name: "机场行李方案",
    priceYuan: 34_000,
    seatCapacityDelta: -1,
    luggageCapacityLDelta: 1_000,
    mutuallyExclusiveGroup: "luggage_package"
  }),
  option({
    code: "luggage_lightweight",
    name: "轻量化小行李舱",
    priceYuan: 8_000,
    luggageCapacityLDelta: -300,
    mutuallyExclusiveGroup: "luggage_package"
  }),
  option({
    code: "luggage_high_roof",
    name: "高顶储物方案",
    priceYuan: 28_000,
    luggageCapacityLDelta: 800,
    mutuallyExclusiveGroup: "luggage_package"
  }),

  // 4. 空调与热管理。
  option({
    code: "climate_standard",
    name: "标准空调",
    priceYuan: 0,
    mutuallyExclusiveGroup: "climate_package"
  }),
  option({
    code: "climate_hot_region",
    name: "高温地区空调包",
    priceYuan: 18_000,
    comfortPermilleDelta: 2,
    mutuallyExclusiveGroup: "climate_package"
  }),
  option({
    code: "climate_cold_region",
    name: "寒区加热包",
    priceYuan: 22_000,
    comfortPermilleDelta: 2,
    mutuallyExclusiveGroup: "climate_package"
  }),
  option({
    code: "climate_dual_zone",
    name: "双区空调",
    priceYuan: 32_000,
    comfortPermilleDelta: 4,
    mutuallyExclusiveGroup: "climate_package"
  }),
  option({
    code: "climate_heat_pump",
    name: "热泵热管理",
    priceYuan: 38_000,
    comfortPermilleDelta: 3,
    mutuallyExclusiveGroup: "climate_package"
  }),
  option({
    code: "climate_premium",
    name: "高级恒温空调",
    priceYuan: 58_000,
    comfortPermilleDelta: 5,
    mutuallyExclusiveGroup: "climate_package"
  }),

  // 5. 舒适设备：可叠加。
  option({
    code: "comfort_usb",
    name: "全车 USB 充电",
    priceYuan: 6_000,
    comfortPermilleDelta: 2
  }),
  option({
    code: "comfort_recline",
    name: "大角度可调座椅",
    priceYuan: 18_000,
    comfortPermilleDelta: 3
  }),
  option({
    code: "comfort_leg_rest",
    name: "腿托组件",
    priceYuan: 26_000,
    comfortPermilleDelta: 4
  }),
  option({
    code: "comfort_quiet",
    name: "静音隔音包",
    priceYuan: 30_000,
    comfortPermilleDelta: 3
  }),
  option({
    code: "comfort_wifi",
    name: "车载 Wi-Fi",
    priceYuan: 12_000,
    comfortPermilleDelta: 2
  }),
  option({
    code: "comfort_sleep_support",
    name: "长途睡眠支撑组件",
    priceYuan: 34_000,
    comfortPermilleDelta: 4
  }),

  // 6. 主动与运营安全：可叠加。
  option({
    code: "safety_basic",
    name: "基础安全包",
    priceYuan: 0
  }),
  option({
    code: "safety_esc",
    name: "车身稳定控制",
    priceYuan: 16_000
  }),
  option({
    code: "safety_lane_warning",
    name: "车道偏离预警",
    priceYuan: 14_000
  }),
  option({
    code: "safety_collision_warning",
    name: "前向碰撞预警",
    priceYuan: 18_000
  }),
  option({
    code: "safety_tire_monitor",
    name: "胎压监测",
    priceYuan: 7_000
  }),
  option({
    code: "safety_driver_monitor",
    name: "驾驶员状态监测",
    priceYuan: 12_000
  }),

  // 7. 车内服务设备：可叠加。
  option({
    code: "service_basic",
    name: "基础服务设备",
    priceYuan: 0
  }),
  option({
    code: "service_entertainment",
    name: "影音娱乐系统",
    priceYuan: 22_000,
    comfortPermilleDelta: 1
  }),
  option({
    code: "service_refrigerator",
    name: "车载冰箱",
    priceYuan: 15_000,
    comfortPermilleDelta: 1
  }),
  option({
    code: "service_hot_water",
    name: "热水设备",
    priceYuan: 12_000,
    comfortPermilleDelta: 1
  }),
  option({
    code: "service_toilet",
    name: "车载卫生间",
    priceYuan: 48_000,
    seatCapacityDelta: -2,
    luggageCapacityLDelta: -220,
    comfortPermilleDelta: 2
  }),
  option({
    code: "service_power_outlet",
    name: "乘客电源插座",
    priceYuan: 8_000,
    comfortPermilleDelta: 1
  }),

  // 8. 外观与运营设备。
  option({
    code: "operation_standard_livery",
    name: "标准运营涂装",
    priceYuan: 0,
    mutuallyExclusiveGroup: "paint_finish"
  }),
  option({
    code: "operation_premium_paint",
    name: "高级车身喷涂",
    priceYuan: 24_000,
    mutuallyExclusiveGroup: "paint_finish"
  }),
  option({
    code: "operation_led_destination",
    name: "LED 线路牌",
    priceYuan: 9_000
  }),
  option({
    code: "operation_roof_storage",
    name: "车顶附加储物组件",
    priceYuan: 18_000,
    luggageCapacityLDelta: 400
  }),
  option({
    code: "operation_accessibility",
    name: "无障碍运营设备",
    priceYuan: 28_000,
    luggageCapacityLDelta: -100
  }),
  option({
    code: "operation_fleet_telematics",
    name: "车队远程管理终端",
    priceYuan: 16_000
  })
];

if (VEHICLE_OPTIONS.length !== 48) {
  throw new Error(
    `Vehicle option catalog must contain exactly 48 definitions, found ${VEHICLE_OPTIONS.length}`
  );
}

const definitionCodes = new Set(
  VEHICLE_OPTIONS.map((definition) => definition.code)
);
for (const code of ALL_VEHICLE_OPTION_CODES) {
  if (!definitionCodes.has(code)) {
    throw new Error(
      `Vehicle option definition missing frozen code: ${code}`
    );
  }
}
