import {
  formatRuntimeId,
  ids
} from "../../contracts/ids/EntityIds.js";
import type { RuntimeIdAllocator } from "../../application/ids/RuntimeIdAllocator.js";

export interface SequentialRuntimeIdAllocatorState {
  readonly route: number;
  readonly servicePlan: number;
  readonly trip: number;
  readonly fleetTask: number;
  readonly vehicle: number;
}

export class SequentialRuntimeIdAllocator
  implements RuntimeIdAllocator {
  private route: number;
  private servicePlan: number;
  private trip: number;
  private fleetTask: number;
  private vehicle: number;

  constructor(state?: SequentialRuntimeIdAllocatorState) {
    this.route = validCounter(state?.route);
    this.servicePlan = validCounter(state?.servicePlan);
    this.trip = validCounter(state?.trip);
    this.fleetTask = validCounter(state?.fleetTask);
    this.vehicle = validCounter(state?.vehicle);
  }

  snapshot(): SequentialRuntimeIdAllocatorState {
    return {
      route: this.route,
      servicePlan: this.servicePlan,
      trip: this.trip,
      fleetTask: this.fleetTask,
      vehicle: this.vehicle
    };
  }

  nextRouteId() {
    return ids.route(
      formatRuntimeId("route", this.route++)
    );
  }

  nextServicePlanId() {
    return ids.servicePlan(
      formatRuntimeId(
        "service_plan",
        this.servicePlan++
      )
    );
  }

  nextTripId() {
    return ids.trip(
      formatRuntimeId("trip", this.trip++)
    );
  }

  nextFleetTaskId() {
    return ids.fleetTask(
      formatRuntimeId(
        "fleet_task",
        this.fleetTask++
      )
    );
  }

  nextVehicleId() {
    return ids.vehicle(
      formatRuntimeId("vehicle", this.vehicle++)
    );
  }
}

function validCounter(value: number | undefined): number {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : 1;
}
