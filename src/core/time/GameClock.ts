import { addGameSeconds } from "./GameTime.js";
import type { GameSecond } from "../units/Units.js";
import { units } from "../units/Units.js";

export class GameClock {
  private current: GameSecond;

  constructor(startAt: GameSecond = units.gameSecond(0)) {
    this.current = startAt;
  }

  now(): GameSecond {
    return this.current;
  }

  advance(delta: GameSecond): GameSecond {
    this.current = addGameSeconds(this.current, delta);
    return this.current;
  }
}
