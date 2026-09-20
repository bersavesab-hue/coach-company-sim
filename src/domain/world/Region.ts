import type { RegionId } from "../../contracts/ids/EntityIds.js";

export type RegionLevel =
  | "country"
  | "macro_region"
  | "province_like"
  | "prefecture_like"
  | "county_like";

export interface RegionBounds {
  readonly minXM: number;
  readonly minYM: number;
  readonly maxXM: number;
  readonly maxYM: number;
}

export interface Region {
  readonly id: RegionId;
  readonly name: string;
  readonly level: RegionLevel;
  readonly parentRegionId: RegionId | null;
  readonly bounds: RegionBounds;
  readonly active: boolean;
}
