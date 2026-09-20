import { requirePositiveInteger } from "./units.js";

export class GameClock {
  constructor(
    public day = 1,
    public secondOfDay = 6 * 60 * 60
  ) {}

  advance(gameSeconds: number): void {
    requirePositiveInteger(gameSeconds, "gameSeconds");

    const total = this.secondOfDay + gameSeconds;
    this.day += Math.floor(total / 86_400);
    this.secondOfDay = total % 86_400;
  }

  get hour(): number {
    return Math.floor(this.secondOfDay / 3_600);
  }

  get minute(): number {
    return Math.floor((this.secondOfDay % 3_600) / 60);
  }
}
