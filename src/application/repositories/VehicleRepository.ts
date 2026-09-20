import type {
  CompanyId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";

export interface VehicleRepository {
  getById(id: VehicleId): OwnedVehicle | undefined;
  findByCompany(companyId: CompanyId): readonly OwnedVehicle[];
  save(vehicle: OwnedVehicle): void;
}
