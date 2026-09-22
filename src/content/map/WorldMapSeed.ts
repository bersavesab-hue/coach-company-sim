import { ids } from "../../contracts/ids/EntityIds.js";
import { units } from "../../core/units/Units.js";
import { WorldGraph } from "../../domain/world/WorldGraph.js";
import type { Region } from "../../domain/world/Region.js";
import type { RoadSegment } from "../../domain/world/RoadSegment.js";
import type { WorldNode } from "../../domain/world/WorldNode.js";
import type { Station } from "../../domain/station/Station.js";
import type { PassengerDemandProfile } from "../../domain/passenger/PassengerDemandProfile.js";
import { FORMAL_WORLD_MAP_CONTENT } from "./FormalWorldMapContent.js";
import { assertValidWorldMapContent } from "./WorldMapContentValidator.js";
import type { StationClass, WorldMapContentV1 } from "./WorldMapContent.js";

export interface WorldMapSeed {
  readonly world: WorldGraph;
  readonly stations: readonly Station[];
  readonly passengerDemand: readonly PassengerDemandProfile[];
  readonly stationNames: Readonly<Record<string, string>>;
}

export function createPlayableWorldSeed(content: WorldMapContentV1 = FORMAL_WORLD_MAP_CONTENT): WorldMapSeed {
  assertValidWorldMapContent(content);
  const regions: Region[] = content.regions.map(v => ({
    id: ids.region(v.id), name: v.name, level: v.level,
    parentRegionId: v.parentRegionId === null ? null : ids.region(v.parentRegionId),
    bounds: v.bounds, active: v.active
  }));
  const nodes: WorldNode[] = content.nodes.map(v => ({
    id: ids.worldNode(v.id), regionId: ids.region(v.regionId), type: v.type,
    name: v.name, position: v.position, active: v.active
  }));
  const roads: RoadSegment[] = content.roads.map(v => ({
    id: ids.roadSegment(v.id), regionId: ids.region(v.regionId),
    fromNodeId: ids.worldNode(v.fromNodeId), toNodeId: ids.worldNode(v.toNodeId),
    lengthM: units.distanceM(v.lengthM), speedLimitMps: units.speedMps(v.speedLimitMps),
    roadClass: v.roadClass, direction: v.direction, polyline: v.polyline, active: v.active
  }));
  const graph = WorldGraph.create(regions, nodes, roads);
  if (!graph.ok) throw graph.error;

  const stations: Station[] = content.stations.filter(v => v.active).map(v => ({
    id: ids.station(v.id), name: v.name, worldNodeId: ids.worldNode(v.worldNodeId),
    ownerCompanyId: null, status: "active"
  }));
  const passengerDemand: PassengerDemandProfile[] = [];
  for (const origin of content.stations) {
    if (!origin.active) continue;
    for (const destination of content.stations) {
      if (!destination.active || origin.id === destination.id) continue;
      passengerDemand.push({
        originStationId: ids.station(origin.id),
        destinationStationId: ids.station(destination.id),
        basePassengersPerHour: Math.max(4, Math.floor((stationDemandWeight(origin.stationClass) + stationDemandWeight(destination.stationClass)) / 2))
      });
    }
  }
  return {
    world: graph.value,
    stations,
    passengerDemand,
    stationNames: Object.fromEntries(stations.map(v => [String(v.id), v.name]))
  };
}

function stationDemandWeight(stationClass: StationClass): number {
  switch (stationClass) {
    case "town": return 6;
    case "county": return 10;
    case "city": return 16;
    case "hub": return 22;
  }
}
