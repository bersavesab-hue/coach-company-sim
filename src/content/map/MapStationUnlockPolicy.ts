import { companyLevelForReputation } from "../company/CompanyGrowthRules.js";
import type { WorldMapStationContent } from "./WorldMapContent.js";

export interface MapStationUnlockEvaluation {
  readonly unlocked: boolean;
  readonly companyLevel: number;
  readonly requiredCompanyLevel: number;
  readonly reputationPermille: number;
  readonly requiredReputationPermille: number;
}

export function evaluateMapStationUnlock(
  station: WorldMapStationContent,
  reputationPermille: number
): MapStationUnlockEvaluation {
  const companyLevel =
    companyLevelForReputation(reputationPermille);
  return {
    unlocked:
      station.active &&
      companyLevel >= station.unlockCompanyLevel &&
      reputationPermille >= station.unlockReputationPermille,
    companyLevel,
    requiredCompanyLevel: station.unlockCompanyLevel,
    reputationPermille,
    requiredReputationPermille:
      station.unlockReputationPermille
  };
}

export function isMapStationUnlocked(
  station: WorldMapStationContent,
  reputationPermille: number
): boolean {
  return evaluateMapStationUnlock(
    station,
    reputationPermille
  ).unlocked;
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
