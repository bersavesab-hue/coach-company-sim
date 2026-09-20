import type {
  FleetTaskId,
  StaffId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { FleetTask } from "../../domain/operations/FleetTask.js";

export interface FleetTaskRepository {
  getById(id: FleetTaskId): FleetTask | undefined;
  findRunning(): readonly FleetTask[];
  findByVehicle(vehicleId: VehicleId): readonly FleetTask[];
  findByDriver(driverId: StaffId): readonly FleetTask[];
  save(task: FleetTask): void;
}
