export const ID_PREFIX = {
  command: "command",
  event: "event",
  company: "company",
  region: "region",
  route: "route",
  servicePlan: "service_plan",
  trip: "trip",
  fleetTask: "fleet_task",
  vehicle: "vehicle",
  vehicleBrand: "vehicle_brand",
  vehicleSeries: "vehicle_series",
  vehicleVariant: "vehicle_variant",
  vehicleConfiguration: "vehicle_configuration",
  vehicleDealer: "vehicle_dealer",
  vehicleListing: "vehicle_listing",
  vehicleModel: "vehicle_model",
  staff: "staff",
  station: "station",
  worldNode: "location",
  roadSegment: "road",
  license: "license",
  farePolicy: "fare_policy",
  financeEntry: "finance_entry"
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

export function hasIdPrefix(value: string, prefix: IdPrefix): boolean {
  return value.startsWith(prefix + ".");
}
