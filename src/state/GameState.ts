import { GameClock } from "../core/GameClock.js";
import { GAME_VERSION, SAVE_VERSION } from "../core/version.js";
import type { CompanyState } from "../domain/company.js";
import type { WorldMap } from "../domain/map.js";
import type { PassengerRoute } from "../domain/route.js";
import type { Vehicle } from "../domain/vehicle.js";

export interface PassengerDemandProfile {
  nodeId: string;
  basePassengersPerGameHour: number;
}

export class GameState {
  readonly gameVersion = GAME_VERSION;
  readonly saveVersion = SAVE_VERSION;
  readonly clock = new GameClock();

  constructor(
    public company: CompanyState,
    public world: WorldMap,
    public routes: Record<string, PassengerRoute>,
    public vehicles: Record<string, Vehicle>,
    public passengerDemand: PassengerDemandProfile[]
  ) {}
}
