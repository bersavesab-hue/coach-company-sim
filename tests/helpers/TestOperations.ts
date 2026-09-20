import type {
  CompanyId,
  FleetTaskId,
  StaffId,
  TripId,
  VehicleId
} from "../../src/contracts/ids/EntityIds.js";
import type { FleetTask } from "../../src/domain/operations/FleetTask.js";
import type { FleetTaskRepository } from "../../src/application/repositories/FleetTaskRepository.js";
import type { OperationsPolicy } from "../../src/application/policies/OperationsPolicy.js";
import type { CommittedOperationsSchedule } from "../../src/domain/operations/CommittedOperationsSchedule.js";
import type { OperationsScheduleRepository } from "../../src/application/repositories/OperationsScheduleRepository.js";

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

export function createTestOperationsScheduleRepository(): OperationsScheduleRepository {
  const schedules = new Map<string, CommittedOperationsSchedule>();

  const key = (companyId: CompanyId, gameDay: number) =>
    `${companyId}:${gameDay}`;

  return {
    getByCompanyAndDay: (companyId, gameDay) =>
      schedules.get(key(companyId, gameDay)),
    findActive: () =>
      [...schedules.values()].filter(
        (schedule) =>
          schedule.status === "active" ||
          schedule.status === "replan_required"
      ),
    findByTrip: (tripId: TripId) =>
      [...schedules.values()].find((schedule) =>
        schedule.actions.some((action) => action.tripId === tripId)
      ),
    save: (schedule) => {
      schedules.set(
        key(schedule.companyId, schedule.gameDay),
        schedule
      );
    }
  };
}

export const zeroOperationsPolicy: OperationsPolicy = {
  vehicleTurnaroundSeconds: () => 0,
  driverTurnaroundSeconds: () => 0,
  passengerBoardingLeadSeconds: () => 0,
  minimumDriverRestSeconds: () => 0,
  maximumContinuousDrivingSeconds: () => 86_400,
  maximumDutySeconds: () => 86_400,
  refuelServiceSeconds: () => 0,
  maintenanceServiceSeconds: () => 0,
  recoveryServiceSeconds: () => 0
};
