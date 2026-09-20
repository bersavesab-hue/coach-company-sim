import type { EventBus } from "../core/events.js";
import type { GameState } from "../state/GameState.js";

export class PassengerDemandSystem {
  private readonly remainderByNode: Record<string, number> = {};

  constructor(private readonly events: EventBus) {}

  update(state: GameState, gameSeconds: number): void {
    for (const profile of state.passengerDemand) {
      const node = state.world.nodes[profile.nodeId];
      if (!node) continue;

      const numerator =
        profile.basePassengersPerGameHour * gameSeconds +
        (this.remainderByNode[profile.nodeId] ?? 0);

      const generated = Math.floor(numerator / 3_600);
      this.remainderByNode[profile.nodeId] = numerator % 3_600;

      if (generated <= 0) continue;

      node.waitingPassengers += generated;

      this.events.emit({
        type: "passengers.generated",
        nodeId: node.id,
        count: generated
      });
    }
  }
}
