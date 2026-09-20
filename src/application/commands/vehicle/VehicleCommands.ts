import type {
  CompanyId,
  StationId,
  VehicleId,
  VehicleModelId
} from "../../../contracts/ids/EntityIds.js";

export interface PurchaseVehiclePayload {
  readonly companyId: CompanyId;
  readonly vehicleModelId: VehicleModelId;
  readonly depotStationId: StationId | null;
}

export interface VehicleByIdPayload {
  readonly vehicleId: VehicleId;
}

export interface PurchaseVehicleEnergyPayload {
  readonly vehicleId: VehicleId;
  readonly energyUnits: number;
}
