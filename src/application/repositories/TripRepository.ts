import type {
  ServicePlanId,
  StaffId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";

export interface TripRepository {
  getById(id: TripId): TripInstance | undefined;
  findByServicePlanAndDeparture(
    servicePlanId: ServicePlanId,
    plannedDepartureGameSecond: GameSecond
  ): TripInstance | undefined;
  findByVehicle(vehicleId: VehicleId): readonly TripInstance[];
  findByDriver(driverId: StaffId): readonly TripInstance[];
  findRunning(): readonly TripInstance[];
  save(trip: TripInstance): void;
}
