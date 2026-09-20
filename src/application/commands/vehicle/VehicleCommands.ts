import type {
  StationId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";

export interface VehicleByIdPayload {
  readonly vehicleId: VehicleId;
}

export interface PurchaseVehicleEnergyPayload {
  readonly vehicleId: VehicleId;
  readonly energyUnits: number;
}
