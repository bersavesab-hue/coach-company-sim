import type { GameSecond } from "../units/Units.js";
import { units } from "../units/Units.js";

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_DAY = 86_400;

export function addGameSeconds(
  current: GameSecond,
  delta: GameSecond
): GameSecond {
  return units.gameSecond(Number(current) + Number(delta));
}

export function gameDayAt(time: GameSecond): number {
  return Math.floor(Number(time) / SECONDS_PER_DAY) + 1;
}

export function secondOfDayAt(time: GameSecond): number {
  return Number(time) % SECONDS_PER_DAY;
}
