import type { VehicleId } from "../../contracts/ids/EntityIds.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";

export interface VehicleRepository {
  getById(id: VehicleId): OwnedVehicle | undefined;
  save(vehicle: OwnedVehicle): void;
}
