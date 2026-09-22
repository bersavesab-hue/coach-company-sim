import type { WorldMapContentV1 } from "./WorldMapContent.js";
import { WORLD_MAP_SCHEMA_VERSION } from "./WorldMapContent.js";

export interface WorldMapValidationResult { readonly valid: boolean; readonly issues: readonly string[]; }
const ROAD_CLASSES = new Set(["local","county_road","provincial_road","national_road","expressway"]);

export function validateWorldMapContent(content: WorldMapContentV1): WorldMapValidationResult {
  const issues: string[] = [];
  if (content.schemaVersion !== WORLD_MAP_SCHEMA_VERSION) issues.push(`schemaVersion must be ${WORLD_MAP_SCHEMA_VERSION}`);
  if (content.background.mode !== "decorative_only") issues.push("background must be decorative_only");
  if (content.regions.length === 0) issues.push("at least one region is required");
  if (content.nodes.length === 0) issues.push("at least one world node is required");
  if (content.roads.length === 0) issues.push("at least one road is required");
  if (content.stations.length === 0) issues.push("at least one station is required");

  const regionIds = uniqueIds(content.regions.map(v => v.id), "region", issues);
  const nodeIds = uniqueIds(content.nodes.map(v => v.id), "node", issues);
  uniqueIds(content.roads.map(v => v.id), "road", issues);
  uniqueIds(content.stations.map(v => v.id), "station", issues);

  for (const region of content.regions) {
    if (region.parentRegionId !== null && !regionIds.has(region.parentRegionId)) issues.push(`region ${region.id} references missing parent ${region.parentRegionId}`);
    if (region.bounds.minXM >= region.bounds.maxXM || region.bounds.minYM >= region.bounds.maxYM) issues.push(`region ${region.id} has invalid bounds`);
  }

  const nodesById = new Map(content.nodes.map(v => [v.id, v]));
  for (const node of content.nodes) {
    if (!regionIds.has(node.regionId)) issues.push(`node ${node.id} references missing region ${node.regionId}`);
    if (!Number.isFinite(node.position.xM) || !Number.isFinite(node.position.yM)) issues.push(`node ${node.id} has invalid coordinates`);
  }

  for (const road of content.roads) {
    if (!regionIds.has(road.regionId)) issues.push(`road ${road.id} references missing region ${road.regionId}`);
    if (!nodeIds.has(road.fromNodeId)) issues.push(`road ${road.id} references missing from node ${road.fromNodeId}`);
    if (!nodeIds.has(road.toNodeId)) issues.push(`road ${road.id} references missing to node ${road.toNodeId}`);
    if (!ROAD_CLASSES.has(road.roadClass)) issues.push(`road ${road.id} has unsupported class ${road.roadClass}`);
    if (road.roadCode !== undefined && !/^[A-Z][0-9]{2,3}$/.test(road.roadCode)) issues.push(`road ${road.id} has invalid roadCode ${road.roadCode}`);
    if (road.displayPriority !== undefined && ![1, 2, 3, 4].includes(road.displayPriority)) issues.push(`road ${road.id} has invalid displayPriority`);
    if (!Number.isSafeInteger(road.lengthM) || road.lengthM <= 0) issues.push(`road ${road.id} has invalid lengthM`);
    if (!Number.isSafeInteger(road.speedLimitMps) || road.speedLimitMps <= 0) issues.push(`road ${road.id} has invalid speedLimitMps`);
    if (road.polyline.length < 2) { issues.push(`road ${road.id} needs at least two polyline points`); continue; }
    const from = nodesById.get(road.fromNodeId);
    const to = nodesById.get(road.toNodeId);
    if (from && !samePoint(road.polyline[0]!, from.position)) issues.push(`road ${road.id} polyline must start at fromNodeId position`);
    if (to && !samePoint(road.polyline[road.polyline.length - 1]!, to.position)) issues.push(`road ${road.id} polyline must end at toNodeId position`);
  }

  const stationNodeIds = new Set<string>();
  for (const station of content.stations) {
    if (!nodeIds.has(station.worldNodeId)) issues.push(`station ${station.id} references missing node ${station.worldNodeId}`);
    if (stationNodeIds.has(station.worldNodeId)) issues.push(`multiple stations share node ${station.worldNodeId}`);
    stationNodeIds.add(station.worldNodeId);
  }
  return { valid: issues.length === 0, issues };
}

export function assertValidWorldMapContent(content: WorldMapContentV1): void {
  const result = validateWorldMapContent(content);
  if (!result.valid) throw new Error(`Invalid formal world map content:\n${result.issues.join("\n")}`);
}
function uniqueIds(ids: readonly string[], label: string, issues: string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  for (const id of ids) { if (seen.has(id)) issues.push(`duplicate ${label} id: ${id}`); seen.add(id); }
  return seen;
}
function samePoint(a: { readonly xM: number; readonly yM: number }, b: { readonly xM: number; readonly yM: number }): boolean {
  return a.xM === b.xM && a.yM === b.yM;
}
