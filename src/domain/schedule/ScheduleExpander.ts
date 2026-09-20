import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import {
  SECONDS_PER_DAY
} from "../../core/time/GameTime.js";
import { units } from "../../core/units/Units.js";
import type { DepartureSlot } from "./DepartureSlot.js";
import type { ServicePlan } from "./ServicePlan.js";
import type { Weekday } from "./ServiceCalendar.js";

const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

export function weekdayForGameDay(gameDay: number): Weekday {
  if (!Number.isSafeInteger(gameDay) || gameDay <= 0) {
    throw new Error("gameDay must be a positive safe integer");
  }

  return WEEKDAYS[(gameDay - 1) % WEEKDAYS.length]!;
}

export function generateDepartureSlots(
  plan: ServicePlan,
  gameDay: number
): Result<readonly DepartureSlot[], DomainError> {
  if (!Number.isSafeInteger(gameDay) || gameDay <= 0) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "gameDay must be a positive safe integer",
        { gameDay }
      )
    );
  }

  if (plan.status !== "active") {
    return ok([]);
  }

  const weekday = weekdayForGameDay(gameDay);
  if (!plan.calendar.serviceDays.includes(weekday)) {
    return ok([]);
  }

  const dayStart = (gameDay - 1) * SECONDS_PER_DAY;
  const secondOfDayValues = expandPattern(plan);
  const departures: DepartureSlot[] = [];

  for (const secondOfDay of secondOfDayValues) {
    const absolute = dayStart + secondOfDay;

    if (absolute < Number(plan.effectiveFromGameSecond)) continue;
    if (
      plan.effectiveUntilGameSecond !== null &&
      absolute > Number(plan.effectiveUntilGameSecond)
    ) {
      continue;
    }

    departures.push({
      servicePlanId: plan.id,
      routeId: plan.routeId,
      plannedDepartureGameSecond: units.gameSecond(absolute)
    });
  }

  return ok(departures);
}

function expandPattern(plan: ServicePlan): readonly number[] {
  const values = new Set<number>();

  if (plan.departurePattern.kind === "fixed_times") {
    for (const value of plan.departurePattern.secondOfDay) {
      values.add(value);
    }
  } else {
    for (const window of plan.departurePattern.windows) {
      for (
        let value = window.startSecondOfDay;
        value <= window.endSecondOfDay;
        value += window.intervalSeconds
      ) {
        values.add(value);
      }
    }
  }

  return [...values].sort((a, b) => a - b);
}
