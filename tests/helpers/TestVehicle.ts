import type {
  CompanyId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../src/contracts/ids/EntityIds.js";
import {
  ids
} from "../../src/contracts/ids/EntityIds.js";
import {
  units,
  type GameSecond
} from "../../src/core/units/Units.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { VehicleLifecycleRuntimeState } from "../../src/domain/vehicle/VehicleLifecycleRuntimeState.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import type { VehicleLifecyclePolicy } from "../../src/application/policies/VehicleLifecyclePolicy.js";
import type { VehicleRuntimeRepository } from "../../src/application/repositories/VehicleRuntimeRepository.js";

export function createTestVehicleModel(
  overrides: Partial<VehicleModel> = {}
): VehicleModel {
  return {
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    seatCapacity: 20,
    maxSpeedMps: units.speedMps(25),
    energyKind: "diesel_ml",
    energyCapacityUnits: 100_000,
    minimumDispatchEnergyUnits: 5_000,
    drivingEnergyUnitsPer100Km: 20_000,
    idleEnergyUnitsPerHour: 2_000,
    serviceIntervalM: 20_000_000,
    powertrainWearPermillePer1000Km: 2,
    brakeWearPermillePer1000Km: 3,
    tireWearPermillePer1000Km: 4,
    minimumPowertrainConditionPermille: 500,
    minimumBrakeConditionPermille: 600,
    minimumTireConditionPermille: 600,
    active: true,
    ...overrides
  };
}

export function createTestOwnedVehicle(input: {
  readonly id?: VehicleId;
  readonly companyId?: CompanyId;
  readonly modelId?: VehicleModelId;
  readonly depotStationId?: StationId | null;
  readonly activeTripId?: TripId | null;
  readonly status?: OwnedVehicle["status"];
  readonly mileageM?: number;
  readonly energyUnits?: number;
  readonly gameSecond?: GameSecond;
  readonly nextMaintenanceMileageM?: number;
} = {}): OwnedVehicle {
  const now = input.gameSecond ?? units.gameSecond(0);
  const mileage = input.mileageM ?? 0;

  return {
    id: input.id ?? ids.vehicle("vehicle.00000001"),
    companyId: input.companyId ?? ids.company("company.00000001"),
    modelId: input.modelId ?? ids.vehicleModel("vehicle_model.000001"),
    configurationId: null,
    seatCapacity: 20,
    energyCapacityUnits: 100_000,
    mileageM: units.distanceM(mileage),
    energyUnits: input.energyUnits ?? 100_000,
    powertrainConditionPermille: units.permille(1000),
    brakeConditionPermille: units.permille(1000),
    tireConditionPermille: units.permille(1000),
    bodyConditionPermille: units.permille(1000),
    lastMaintenanceMileageM: units.distanceM(0),
    nextMaintenanceMileageM: units.distanceM(
      input.nextMaintenanceMileageM ?? 20_000_000
    ),
    registeredAtGameSecond: now,
    insuranceValidUntilGameSecond: units.gameSecond(
      Number(now) + 365 * 86_400
    ),
    inspectionValidUntilGameSecond: units.gameSecond(
      Number(now) + 365 * 86_400
    ),
    status: input.status ?? "available",
    activeIncident: null,
    depotStationId: input.depotStationId ?? null,
    currentStationId: input.depotStationId ?? null,
    availableAtGameSecond: now,
    activeTripId: input.activeTripId ?? null,
    activeFleetTaskId: null
  };
}

export function createTestVehicleRuntimeRepository(): VehicleRuntimeRepository {
  let state = new VehicleLifecycleRuntimeState();
  return {
    get: () => state,
    replace: (value) => {
      state = value;
    }
  };
}

export const zeroVehicleLifecyclePolicy: VehicleLifecyclePolicy = {
  quoteInitialOwnershipTerms: () => ({
    residualValueCents: units.moneyCents(0),
    usefulLifeDays: 3650,
    initialInsuranceValidDays: 365,
    initialInspectionValidDays: 365,
    dailyInsuranceCents: units.moneyCents(0),
    dailyVehicleTaxCents: units.moneyCents(0)
  }),
  quoteMaintenance: () => units.moneyCents(0),
  quoteInsuranceRenewal: () => ({
    costCents: units.moneyCents(0),
    validForDays: 365
  }),
  quoteInspection: () => ({
    costCents: units.moneyCents(0),
    validForDays: 365
  }),
  quoteResale: () => units.moneyCents(0),
  quoteScrap: () => units.moneyCents(0)
};
