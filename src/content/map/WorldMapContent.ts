import type { RoadClass, RoadDirection } from "../../domain/world/RoadSegment.js";
import type { RegionLevel } from "../../domain/world/Region.js";
import type { WorldNodeType } from "../../domain/world/WorldNode.js";

export const WORLD_MAP_SCHEMA_VERSION = 1 as const;
export type StationClass = "town" | "county" | "city" | "hub";
export type RoadRole =
  | "mainline"
  | "urban_ring"
  | "connector"
  | "ramp"
  | "local_access";

export interface WorldMapPointContent { readonly xM: number; readonly yM: number; }
export interface WorldMapBoundsContent { readonly minXM: number; readonly minYM: number; readonly maxXM: number; readonly maxYM: number; }
export interface WorldMapRegionContent {
  readonly id: string; readonly name: string; readonly level: RegionLevel;
  readonly parentRegionId: string | null; readonly bounds: WorldMapBoundsContent; readonly active: boolean;
}
export interface WorldMapNodeContent {
  readonly id: string; readonly regionId: string; readonly type: WorldNodeType;
  readonly name: string; readonly position: WorldMapPointContent; readonly active: boolean;
}
export interface WorldMapRoadContent {
  readonly id: string; readonly regionId: string; readonly fromNodeId: string; readonly toNodeId: string;
  readonly lengthM: number; readonly speedLimitMps: number; readonly roadClass: RoadClass;
  readonly direction: RoadDirection; readonly polyline: readonly WorldMapPointContent[]; readonly active: boolean;
  readonly roadCode?: string;
  readonly displayPriority?: 1 | 2 | 3 | 4;
  readonly showLabel?: boolean;
  readonly roadRole?: RoadRole;
}
export interface WorldMapStationContent {
  readonly id: string; readonly name: string; readonly worldNodeId: string;
  readonly stationClass: StationClass; readonly active: boolean;
  readonly unlockReputationPermille: number;
}
export interface WorldMapBackgroundContent { readonly mode: "decorative_only"; readonly assetPath: string | null; }
export interface WorldMapContentV1 {
  readonly schemaVersion: typeof WORLD_MAP_SCHEMA_VERSION;
  readonly mapId: string; readonly name: string; readonly background: WorldMapBackgroundContent;
  readonly regions: readonly WorldMapRegionContent[]; readonly nodes: readonly WorldMapNodeContent[];
  readonly roads: readonly WorldMapRoadContent[]; readonly stations: readonly WorldMapStationContent[];
}
