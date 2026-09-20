import type {
  CompanyId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  GameSecond,
  Permille
} from "../../core/units/Units.js";
import type { VehicleIncident } from "./VehicleIncident.js";
import type { VehicleStatus } from "./VehicleStatus.js";

export interface OwnedVehicle {
  readonly id: VehicleId;
  readonly companyId: CompanyId;
  readonly modelId: VehicleModelId;

  readonly mileageM: DistanceM;
  readonly energyUnits: number;

  readonly powertrainConditionPermille: Permille;
  readonly brakeConditionPermille: Permille;
  readonly tireConditionPermille: Permille;
  readonly bodyConditionPermille: Permille;

  readonly lastMaintenanceMileageM: DistanceM;
  readonly nextMaintenanceMileageM: DistanceM;

  readonly registeredAtGameSecond: GameSecond;
  readonly insuranceValidUntilGameSecond: GameSecond;
  readonly inspectionValidUntilGameSecond: GameSecond;

  readonly status: VehicleStatus;
  readonly activeIncident: VehicleIncident | null;
  readonly depotStationId: StationId | null;
  readonly activeTripId: TripId | null;
}
