export const VEHICLE_OPTION_CODES = {
  seat: [
    "seat_dense",
    "seat_standard",
    "seat_comfort",
    "seat_business",
    "seat_space",
    "seat_accessible"
  ],
  energy: [
    "energy_standard",
    "energy_long_range",
    "energy_ultra_range",
    "energy_lightweight",
    "energy_intercity",
    "energy_cold_weather"
  ],
  luggage: [
    "luggage_standard",
    "luggage_large",
    "luggage_tourism",
    "luggage_airport",
    "luggage_lightweight",
    "luggage_high_roof"
  ],
  climate: [
    "climate_standard",
    "climate_hot_region",
    "climate_cold_region",
    "climate_dual_zone",
    "climate_heat_pump",
    "climate_premium"
  ],
  comfort: [
    "comfort_usb",
    "comfort_recline",
    "comfort_leg_rest",
    "comfort_quiet",
    "comfort_wifi",
    "comfort_sleep_support"
  ],
  safety: [
    "safety_basic",
    "safety_esc",
    "safety_lane_warning",
    "safety_collision_warning",
    "safety_tire_monitor",
    "safety_driver_monitor"
  ],
  service: [
    "service_basic",
    "service_entertainment",
    "service_refrigerator",
    "service_hot_water",
    "service_toilet",
    "service_power_outlet"
  ],
  operation: [
    "operation_standard_livery",
    "operation_premium_paint",
    "operation_led_destination",
    "operation_roof_storage",
    "operation_accessibility",
    "operation_fleet_telematics"
  ]
} as const;

export type VehicleOptionCode =
  (typeof VEHICLE_OPTION_CODES)[keyof typeof VEHICLE_OPTION_CODES][number];

export const ALL_VEHICLE_OPTION_CODES: readonly VehicleOptionCode[] =
  Object.values(VEHICLE_OPTION_CODES).flat();

if (ALL_VEHICLE_OPTION_CODES.length !== 48) {
  throw new Error("Vehicle option code catalog must contain exactly 48 codes");
}
