import type {
  CompanyId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  Permille
} from "../../core/units/Units.js";
import type { VehicleStatus } from "./VehicleStatus.js";

export interface OwnedVehicle {
  readonly id: VehicleId;
  readonly companyId: CompanyId;
  readonly modelId: VehicleModelId;
  readonly mileageM: DistanceM;
  readonly conditionPermille: Permille;
  readonly fuelPermille: Permille;
  readonly status: VehicleStatus;
  readonly depotStationId: StationId | null;
  readonly activeTripId: TripId | null;
}
