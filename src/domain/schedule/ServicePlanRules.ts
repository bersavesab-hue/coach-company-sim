import type {
  RouteId,
  ServicePlanId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { DeparturePattern } from "./DeparturePattern.js";
import type { ServiceCalendar } from "./ServiceCalendar.js";
import type { ServicePlan } from "./ServicePlan.js";

export interface ServicePlanInput {
  readonly id: ServicePlanId;
  readonly routeId: RouteId;
  readonly effectiveFromGameSecond: GameSecond;
  readonly effectiveUntilGameSecond: GameSecond | null;
  readonly calendar: ServiceCalendar;
  readonly departurePattern: DeparturePattern;
  readonly requiredVehicleClass: string;
}

export function createServicePlan(
  input: ServicePlanInput
): Result<ServicePlan, DomainError> {
  const validation = validateServicePlanInput(input);
  if (!validation.ok) return validation;

  return ok({
    ...input,
    calendar: {
      serviceDays: [...input.calendar.serviceDays]
    },
    departurePattern: cloneDeparturePattern(input.departurePattern),
    requiredVehicleClass: input.requiredVehicleClass.trim(),
    status: "active"
  });
}

export function updateServicePlan(
  plan: ServicePlan,
  input: Omit<ServicePlanInput, "id" | "routeId">
): Result<ServicePlan, DomainError> {
  if (plan.status === "cancelled") {
    return err(
      new DomainError(
        "SERVICE_PLAN_INACTIVE",
        "Cancelled service plan cannot be updated",
        { servicePlanId: plan.id }
      )
    );
  }

  const validation = validateServicePlanInput({
    ...input,
    id: plan.id,
    routeId: plan.routeId
  });
  if (!validation.ok) return validation;

  return ok({
    ...plan,
    ...input,
    calendar: {
      serviceDays: [...input.calendar.serviceDays]
    },
    departurePattern: cloneDeparturePattern(input.departurePattern),
    requiredVehicleClass: input.requiredVehicleClass.trim()
  });
}

export function cancelServicePlan(
  plan: ServicePlan
): Result<ServicePlan, DomainError> {
  if (plan.status === "cancelled") {
    return err(
      new DomainError(
        "SERVICE_PLAN_INACTIVE",
        "Service plan is already cancelled",
        { servicePlanId: plan.id }
      )
    );
  }

  return ok({
    ...plan,
    status: "cancelled"
  });
}

function validateServicePlanInput(
  input: ServicePlanInput
): Result<true, DomainError> {
  if (
    input.effectiveUntilGameSecond !== null &&
    Number(input.effectiveUntilGameSecond) <
      Number(input.effectiveFromGameSecond)
  ) {
    return err(
      new DomainError(
        "SERVICE_PLAN_INVALID",
        "Service plan end time cannot precede start time"
      )
    );
  }

  if (input.requiredVehicleClass.trim().length === 0) {
    return err(
      new DomainError(
        "SERVICE_PLAN_INVALID",
        "Required vehicle class cannot be empty"
      )
    );
  }

  if (
    input.calendar.serviceDays.length === 0 ||
    new Set(input.calendar.serviceDays).size !==
      input.calendar.serviceDays.length
  ) {
    return err(
      new DomainError(
        "SERVICE_PLAN_INVALID",
        "Service calendar must contain unique service days"
      )
    );
  }

  const patternValidation = validateDeparturePattern(
    input.departurePattern
  );
  if (!patternValidation.ok) return patternValidation;

  return ok(true);
}

function validateDeparturePattern(
  pattern: DeparturePattern
): Result<true, DomainError> {
  if (pattern.kind === "fixed_times") {
    if (
      pattern.secondOfDay.length === 0 ||
      new Set(pattern.secondOfDay).size !== pattern.secondOfDay.length
    ) {
      return err(
        new DomainError(
          "SERVICE_PLAN_INVALID",
          "Fixed departure times must be non-empty and unique"
        )
      );
    }

    for (const value of pattern.secondOfDay) {
      if (!isSecondOfDay(value)) {
        return err(
          new DomainError(
            "SERVICE_PLAN_INVALID",
            "Fixed departure time is outside one game day",
            { secondOfDay: value }
          )
        );
      }
    }

    return ok(true);
  }

  if (pattern.windows.length === 0) {
    return err(
      new DomainError(
        "SERVICE_PLAN_INVALID",
        "Interval departure pattern requires at least one window"
      )
    );
  }

  for (const window of pattern.windows) {
    if (
      !isSecondOfDay(window.startSecondOfDay) ||
      !isSecondOfDay(window.endSecondOfDay) ||
      window.endSecondOfDay < window.startSecondOfDay ||
      !Number.isSafeInteger(window.intervalSeconds) ||
      window.intervalSeconds <= 0
    ) {
      return err(
        new DomainError(
          "SERVICE_PLAN_INVALID",
          "Interval departure window is invalid",
          { window }
        )
      );
    }
  }

  return ok(true);
}

function isSecondOfDay(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value < 86_400
  );
}

function cloneDeparturePattern(
  pattern: DeparturePattern
): DeparturePattern {
  if (pattern.kind === "fixed_times") {
    return {
      kind: "fixed_times",
      secondOfDay: [...pattern.secondOfDay]
    };
  }

  return {
    kind: "interval_window",
    windows: pattern.windows.map((window) => ({ ...window }))
  };
}
