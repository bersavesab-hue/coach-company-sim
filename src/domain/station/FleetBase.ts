import type { CompanyId, StationId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond, MoneyCents } from "../../core/units/Units.js";

export interface FleetBase {
  readonly companyId: CompanyId;
  readonly stationId: StationId;
  readonly level: number;
  readonly dailyLeaseCents: MoneyCents;
  readonly openedAtGameSecond: GameSecond;
}

export const MAX_FLEET_BASE_LEVEL = 10;

export function fleetBaseCapacity(level: number): number {
  return level * 12;
}
