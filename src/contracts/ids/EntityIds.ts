import { hasIdPrefix, ID_PREFIX, type IdPrefix } from "./IdPrefix.js";

declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

export type CommandId = Brand<string, "CommandId">;
export type EventId = Brand<string, "EventId">;
export type FinanceEntryId = Brand<string, "FinanceEntryId">;
export type CompanyId = Brand<string, "CompanyId">;
export type RegionId = Brand<string, "RegionId">;
export type RouteId = Brand<string, "RouteId">;
export type ServicePlanId = Brand<string, "ServicePlanId">;
export type TripId = Brand<string, "TripId">;
export type FleetTaskId = Brand<string, "FleetTaskId">;
export type VehicleId = Brand<string, "VehicleId">;
export type VehicleModelId = Brand<string, "VehicleModelId">;
export type StaffId = Brand<string, "StaffId">;
export type StationId = Brand<string, "StationId">;
export type WorldNodeId = Brand<string, "WorldNodeId">;
export type RoadSegmentId = Brand<string, "RoadSegmentId">;
export type LicenseId = Brand<string, "LicenseId">;
export type FarePolicyId = Brand<string, "FarePolicyId">;

function asId<T extends string>(
  value: string,
  prefix: IdPrefix,
  label: string
): Brand<string, T> {
  if (!hasIdPrefix(value, prefix)) {
    throw new Error(`${label} must start with "${prefix}."`);
  }
  return value as Brand<string, T>;
}

export const ids = {
  command: (value: string): CommandId =>
    asId<"CommandId">(value, ID_PREFIX.command, "CommandId"),
  event: (value: string): EventId =>
    asId<"EventId">(value, ID_PREFIX.event, "EventId"),
  financeEntry: (value: string): FinanceEntryId =>
    asId<"FinanceEntryId">(
      value,
      ID_PREFIX.financeEntry,
      "FinanceEntryId"
    ),
  company: (value: string): CompanyId =>
    asId<"CompanyId">(value, ID_PREFIX.company, "CompanyId"),
  region: (value: string): RegionId =>
    asId<"RegionId">(value, ID_PREFIX.region, "RegionId"),
  route: (value: string): RouteId =>
    asId<"RouteId">(value, ID_PREFIX.route, "RouteId"),
  servicePlan: (value: string): ServicePlanId =>
    asId<"ServicePlanId">(value, ID_PREFIX.servicePlan, "ServicePlanId"),
  trip: (value: string): TripId =>
    asId<"TripId">(value, ID_PREFIX.trip, "TripId"),
  fleetTask: (value: string): FleetTaskId =>
    asId<"FleetTaskId">(value, ID_PREFIX.fleetTask, "FleetTaskId"),
  vehicle: (value: string): VehicleId =>
    asId<"VehicleId">(value, ID_PREFIX.vehicle, "VehicleId"),
  vehicleModel: (value: string): VehicleModelId =>
    asId<"VehicleModelId">(value, ID_PREFIX.vehicleModel, "VehicleModelId"),
  staff: (value: string): StaffId =>
    asId<"StaffId">(value, ID_PREFIX.staff, "StaffId"),
  station: (value: string): StationId =>
    asId<"StationId">(value, ID_PREFIX.station, "StationId"),
  worldNode: (value: string): WorldNodeId =>
    asId<"WorldNodeId">(value, ID_PREFIX.worldNode, "WorldNodeId"),
  roadSegment: (value: string): RoadSegmentId =>
    asId<"RoadSegmentId">(value, ID_PREFIX.roadSegment, "RoadSegmentId"),
  license: (value: string): LicenseId =>
    asId<"LicenseId">(value, ID_PREFIX.license, "LicenseId"),
  farePolicy: (value: string): FarePolicyId =>
    asId<"FarePolicyId">(value, ID_PREFIX.farePolicy, "FarePolicyId")
} as const;

export function formatRuntimeId(prefix: IdPrefix, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new Error("Runtime ID sequence must be a positive safe integer");
  }

  const width = prefix === ID_PREFIX.trip || prefix === ID_PREFIX.event
    ? 12
    : 8;

  return `${prefix}.${String(sequence).padStart(width, "0")}`;
}

export function deriveEventId(
  commandId: CommandId,
  ordinal = 1
): EventId {
  if (!Number.isSafeInteger(ordinal) || ordinal <= 0) {
    throw new Error("Event ordinal must be a positive safe integer");
  }

  const commandSuffix = String(commandId).slice("command.".length);
  return ids.event(
    `event.${commandSuffix}.${String(ordinal).padStart(2, "0")}`
  );
}
