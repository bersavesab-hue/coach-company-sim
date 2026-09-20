import type {
  VehicleModelId,
  VehicleSeriesId
} from "../../contracts/ids/EntityIds.js";

export interface VehicleModelIdentity {
  readonly modelId: VehicleModelId;
  readonly seriesId: VehicleSeriesId;
  readonly displayName: string;
  readonly productionStartYear: number;
  readonly productionEndYear: number | null;
}
