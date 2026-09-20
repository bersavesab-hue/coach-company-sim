import type {
  VehicleId
} from "../ids/EntityIds.js";
import type { VehicleStatus } from "../../domain/vehicle/VehicleStatus.js";
import type { VehicleIncidentKind } from "../../domain/vehicle/VehicleIncident.js";

export interface VehicleLifecycleDto {
  readonly vehicleId: VehicleId;
  readonly status: VehicleStatus;
  readonly energyUnits: number;
  readonly energyCapacityUnits: number;
  readonly mileageM: number;
  readonly kilometersUntilMaintenance: number;
  readonly powertrainConditionPermille: number;
  readonly brakeConditionPermille: number;
  readonly tireConditionPermille: number;
  readonly bodyConditionPermille: number;
  readonly insuranceValid: boolean;
  readonly inspectionValid: boolean;
  readonly activeIncident: VehicleIncidentKind | null;
}
