import type {
  VehicleBrandId,
  VehicleSeriesId
} from "../../contracts/ids/EntityIds.js";

export interface VehicleSeries {
  readonly id: VehicleSeriesId;
  readonly brandId: VehicleBrandId;
  readonly name: string;
  readonly active: boolean;
}
