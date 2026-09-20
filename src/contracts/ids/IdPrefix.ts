export const ID_PREFIX = {
  command: "command",
  event: "event",
  company: "company",
  region: "region",
  route: "route",
  servicePlan: "service_plan",
  trip: "trip",
  vehicle: "vehicle",
  vehicleModel: "vehicle_model",
  staff: "staff",
  station: "station",
  worldNode: "location",
  roadSegment: "road",
  license: "license",
  farePolicy: "fare_policy"
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

export function hasIdPrefix(value: string, prefix: IdPrefix): boolean {
  return value.startsWith(prefix + ".");
}
