import type { EventBus } from "../core/events.js";
import type { GameState } from "../state/GameState.js";
import { pointOnRoad } from "./mapGeometry.js";

export class VehicleMovementSystem {
  constructor(private readonly events: EventBus) {}

  update(state: GameState, gameSeconds: number): void {
    for (const vehicle of Object.values(state.vehicles)) {
      if (vehicle.status !== "running" || !vehicle.routeId) continue;

      const route = state.routes[vehicle.routeId];

      if (!route || !route.active || route.roadSegmentIds.length === 0) {
        vehicle.status = "idle";
        continue;
      }

      let remainingSeconds = gameSeconds;

      while (remainingSeconds > 0 && vehicle.status === "running") {
        const roadId = route.roadSegmentIds[vehicle.routeSegmentIndex];

        if (!roadId) {
          vehicle.status = "idle";
          this.events.emit({
            type: "vehicle.arrived",
            vehicleId: vehicle.id,
            routeId: route.id
          });
          break;
        }

        const road = state.world.roads[roadId];
        if (!road) {
          throw new Error(
            `Route ${route.id} references missing road ${roadId}`
          );
        }

        const speedMps = Math.min(
          vehicle.cruiseSpeedMps,
          road.speedLimitMps
        );

        if (speedMps <= 0) {
          throw new Error(`Road ${road.id} or vehicle ${vehicle.id} has invalid speed`);
        }

        const availableM = road.lengthM - vehicle.offsetOnSegmentM;
        const possibleM = Math.floor(speedMps * remainingSeconds);
        const movedM = Math.min(availableM, possibleM);

        if (movedM <= 0) break;

        vehicle.offsetOnSegmentM += movedM;
        vehicle.mileageM += movedM;
        remainingSeconds -= movedM / speedMps;

        vehicle.worldPosition = pointOnRoad(
          road,
          vehicle.offsetOnSegmentM
        );

        this.events.emit({
          type: "vehicle.moved",
          vehicleId: vehicle.id,
          position: { ...vehicle.worldPosition }
        });

        if (vehicle.offsetOnSegmentM >= road.lengthM) {
          vehicle.routeSegmentIndex += 1;
          vehicle.offsetOnSegmentM = 0;

          if (vehicle.routeSegmentIndex >= route.roadSegmentIds.length) {
            vehicle.status = "idle";
            this.events.emit({
              type: "vehicle.arrived",
              vehicleId: vehicle.id,
              routeId: route.id
            });
          }
        }
      }
    }
  }
}
