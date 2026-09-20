import type { VehicleModelId } from "../../contracts/ids/EntityIds.js";
import type { SpeedMps } from "../../core/units/Units.js";
import type { EnergyKind } from "./EnergyKind.js";

export interface VehicleModel {
  readonly id: VehicleModelId;
  readonly serviceClass: string;
  readonly seatCapacity: number;
  readonly maxSpeedMps: SpeedMps;

  readonly energyKind: EnergyKind;
  readonly energyCapacityUnits: number;
  readonly minimumDispatchEnergyUnits: number;
  readonly drivingEnergyUnitsPer100Km: number;
  readonly idleEnergyUnitsPerHour: number;

  readonly serviceIntervalM: number;
  readonly powertrainWearPermillePer1000Km: number;
  readonly brakeWearPermillePer1000Km: number;
  readonly tireWearPermillePer1000Km: number;
  readonly minimumPowertrainConditionPermille: number;
  readonly minimumBrakeConditionPermille: number;
  readonly minimumTireConditionPermille: number;

  readonly active: boolean;
}
