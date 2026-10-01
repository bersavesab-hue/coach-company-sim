import type { Company } from "../../domain/company/Company.js";
import type { StationId } from "../../contracts/ids/EntityIds.js";
import { units } from "../../core/units/Units.js";
import { FORMAL_WORLD_MAP_CONTENT } from "../map/FormalWorldMapContent.js";
import { isMapStationUnlocked } from "../map/MapStationUnlockPolicy.js";

export function fleetBaseTerms(stationId: StationId, level = 1) {
  const station = FORMAL_WORLD_MAP_CONTENT.stations.find(s => s.id === String(stationId));
  const tier = station?.stationTier ?? 2;
  return {
    openingCostCents: units.moneyCents(6_000_000 + tier * 3_000_000),
    upgradeCostCents: units.moneyCents(4_000_000 * level + tier * 1_000_000),
    dailyLeaseCents: units.moneyCents(Math.round((station?.dailyLeaseCents ?? 25_000) * (1 + (level - 1) * .5)))
  };
}

export function canOpenFleetBase(company: Company, stationId: StationId): boolean {
  const station = FORMAL_WORLD_MAP_CONTENT.stations.find(s => s.id === String(stationId));
  return !station || isMapStationUnlocked(station, Number(company.reputationPermille));
}
