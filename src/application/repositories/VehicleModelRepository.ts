import type { VehicleModelId } from "../../contracts/ids/EntityIds.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";

export interface VehicleModelRepository {
  getById(id: VehicleModelId): VehicleModel | undefined;
}
