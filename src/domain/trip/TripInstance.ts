import type {
  RouteId,
  ServicePlanId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { OnboardPassengerGroup } from "../passenger/OnboardPassengerGroup.js";
import type { TripPosition } from "./TripPosition.js";
import type { TripStatus } from "./TripStatus.js";

export interface TripInstance {
  readonly id: TripId;
  readonly routeId: RouteId;
  readonly servicePlanId: ServicePlanId | null;
  readonly vehicleId: VehicleId | null;
  readonly driverId: StaffId | null;
  readonly status: TripStatus;
  readonly plannedDepartureGameSecond: GameSecond;
  readonly actualDepartureGameSecond: GameSecond | null;
  readonly actualArrivalGameSecond: GameSecond | null;
  readonly position: TripPosition;
  readonly onboardPassengerGroups: readonly OnboardPassengerGroup[];
  readonly recoveryStationId: StationId | null;
  readonly delaySeconds: GameSecond;
}
