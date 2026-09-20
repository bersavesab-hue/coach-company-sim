import { EventBus } from "../core/events.js";
import { requirePositiveInteger } from "../core/units.js";
import type { GameState } from "../state/GameState.js";
import { PassengerDemandSystem } from "../simulation/PassengerDemandSystem.js";
import { VehicleMovementSystem } from "../simulation/VehicleMovementSystem.js";
import type { GameCommand } from "./commands.js";

export class PassengerTransportApp {
  readonly events = new EventBus();

  private readonly passengerDemand = new PassengerDemandSystem(this.events);
  private readonly vehicleMovement = new VehicleMovementSystem(this.events);

  constructor(readonly state: GameState) {}

  dispatch(command: GameCommand): void {
    const vehicle = this.state.vehicles[command.vehicleId];

    if (!vehicle) {
      throw new Error(`Unknown vehicle: ${command.vehicleId}`);
    }

    switch (command.type) {
      case "vehicle.assignRoute": {
        const route = this.state.routes[command.routeId];

        if (!route || !route.active) {
          throw new Error(`Unknown or inactive route: ${command.routeId}`);
        }

        const firstRoadId = route.roadSegmentIds[0];
        const firstRoad = firstRoadId
          ? this.state.world.roads[firstRoadId]
          : undefined;

        if (!firstRoad || firstRoad.polyline.length === 0) {
          throw new Error(`Route ${route.id} has no valid first road`);
        }

        vehicle.routeId = route.id;
        vehicle.routeSegmentIndex = 0;
        vehicle.offsetOnSegmentM = 0;
        vehicle.worldPosition = { ...firstRoad.polyline[0]! };

        this.events.emit({
          type: "vehicle.routeAssigned",
          vehicleId: vehicle.id,
          routeId: route.id
        });
        return;
      }

      case "vehicle.start": {
        if (!vehicle.routeId) {
          throw new Error("Vehicle has no assigned route");
        }

        vehicle.status = "running";

        this.events.emit({
          type: "vehicle.started",
          vehicleId: vehicle.id,
          routeId: vehicle.routeId
        });
        return;
      }

      case "vehicle.stop": {
        vehicle.status = "idle";

        this.events.emit({
          type: "vehicle.stopped",
          vehicleId: vehicle.id
        });
        return;
      }
    }
  }

  tick(gameSeconds: number): void {
    requirePositiveInteger(gameSeconds, "gameSeconds");

    this.state.clock.advance(gameSeconds);
    this.passengerDemand.update(this.state, gameSeconds);
    this.vehicleMovement.update(this.state, gameSeconds);

    this.events.emit({
      type: "time.advanced",
      gameSeconds
    });
  }
}
