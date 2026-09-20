import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import type { TripInstance } from "./TripInstance.js";
import type { TripStatus } from "./TripStatus.js";

const ALLOWED: Readonly<Record<TripStatus, readonly TripStatus[]>> = {
  planned: ["boarding", "cancelled"],
  boarding: ["running", "cancelled"],
  running: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function canTransitionTrip(
  from: TripStatus,
  to: TripStatus
): boolean {
  return ALLOWED[from].includes(to);
}

export function transitionTrip(
  trip: TripInstance,
  to: TripStatus
): Result<TripInstance, DomainError> {
  if (!canTransitionTrip(trip.status, to)) {
    return err(
      new DomainError(
        "INVALID_STATE_TRANSITION",
        `Trip cannot transition from ${trip.status} to ${to}`,
        { tripId: trip.id, from: trip.status, to }
      )
    );
  }

  return ok({
    ...trip,
    status: to
  });
}
