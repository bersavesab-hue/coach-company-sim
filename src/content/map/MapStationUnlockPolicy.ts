import type { WorldMapStationContent } from "./WorldMapContent.js";

export function isMapStationUnlocked(
  station: WorldMapStationContent,
  reputationPermille: number
): boolean {
  return (
    station.active &&
    reputationPermille >= station.unlockReputationPermille
  );
}

export function unlockedMapStationIds(
  stations: readonly WorldMapStationContent[],
  reputationPermille: number
): ReadonlySet<string> {
  return new Set(
    stations
      .filter((station) =>
        isMapStationUnlocked(station, reputationPermille)
      )
      .map((station) => station.id)
  );
}
