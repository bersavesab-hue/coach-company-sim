import type {
  RouteId,
  StaffId,
  StationId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { VehicleIncidentKind } from "../../domain/vehicle/VehicleIncident.js";
import type { EnergyKind } from "../../domain/vehicle/EnergyKind.js";

export interface OperationsPolicy {
  vehicleTurnaroundSeconds(
    vehicleId: VehicleId,
    stationId: StationId
  ): number;

  driverTurnaroundSeconds(
    driverId: StaffId,
    stationId: StationId
  ): number;

  passengerBoardingLeadSeconds(routeId: RouteId): number;

  minimumDriverRestSeconds(driverId: StaffId): number;
  maximumContinuousDrivingSeconds(driverId: StaffId): number;
  maximumDutySeconds(driverId: StaffId): number;

  refuelServiceSeconds(
    energyKind: EnergyKind,
    energyUnits: number
  ): number;

  maintenanceServiceSeconds(vehicleId: VehicleId): number;

  recoveryServiceSeconds(
    vehicleId: VehicleId,
    incident: VehicleIncidentKind
  ): number;
}
