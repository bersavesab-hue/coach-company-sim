import type {
  FleetTaskId,
  StaffId,
  VehicleId
} from "../../src/contracts/ids/EntityIds.js";
import type { FleetTask } from "../../src/domain/operations/FleetTask.js";
import type { FleetTaskRepository } from "../../src/application/repositories/FleetTaskRepository.js";
import type { OperationsPolicy } from "../../src/application/policies/OperationsPolicy.js";

export function createTestFleetTaskRepository(): FleetTaskRepository {
  const tasks = new Map<FleetTaskId, FleetTask>();
  return {
    getById: (id) => tasks.get(id),
    findRunning: () =>
      [...tasks.values()].filter((task) => task.status === "running"),
    findByVehicle: (vehicleId: VehicleId) =>
      [...tasks.values()].filter((task) => task.vehicleId === vehicleId),
    findByDriver: (driverId: StaffId) =>
      [...tasks.values()].filter((task) => task.driverId === driverId),
    save: (task) => {
      tasks.set(task.id, task);
    }
  };
}

export const zeroOperationsPolicy: OperationsPolicy = {
  vehicleTurnaroundSeconds: () => 0,
  driverTurnaroundSeconds: () => 0,
  minimumDriverRestSeconds: () => 0,
  maximumContinuousDrivingSeconds: () => 86_400,
  maximumDutySeconds: () => 86_400,
  refuelServiceSeconds: () => 0,
  maintenanceServiceSeconds: () => 0,
  recoveryServiceSeconds: () => 0
};
