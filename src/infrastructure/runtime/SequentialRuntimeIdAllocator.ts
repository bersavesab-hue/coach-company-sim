import {
  formatRuntimeId,
  ids
} from "../../contracts/ids/EntityIds.js";
import type { RuntimeIdAllocator } from "../../application/ids/RuntimeIdAllocator.js";

export class SequentialRuntimeIdAllocator
  implements RuntimeIdAllocator {
  private route = 1;
  private servicePlan = 1;
  private trip = 1;
  private fleetTask = 1;
  private vehicle = 1;

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
