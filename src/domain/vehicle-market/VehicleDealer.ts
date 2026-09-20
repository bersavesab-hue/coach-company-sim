import type {
  RegionId,
  VehicleBrandId,
  VehicleDealerId
} from "../../contracts/ids/EntityIds.js";

export type VehicleDealerKind =
  | "manufacturer_dealer"
  | "regional_dealer"
  | "used_vehicle_dealer"
  | "auction_house";

export interface VehicleDealer {
  readonly id: VehicleDealerId;
  readonly name: string;
  readonly kind: VehicleDealerKind;
  readonly regionId: RegionId | null;
  readonly supportedBrandIds: readonly VehicleBrandId[];
  readonly active: boolean;
}
