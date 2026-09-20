import type { WorldPoint } from "../domain/map.js";

export type DomainEvent =
  | { type: "time.advanced"; gameSeconds: number }
  | { type: "passengers.generated"; nodeId: string; count: number }
  | { type: "vehicle.routeAssigned"; vehicleId: string; routeId: string }
  | { type: "vehicle.started"; vehicleId: string; routeId: string }
  | { type: "vehicle.stopped"; vehicleId: string }
  | { type: "vehicle.moved"; vehicleId: string; position: WorldPoint }
  | { type: "vehicle.arrived"; vehicleId: string; routeId: string };

export type DomainEventHandler = (event: DomainEvent) => void;

export class EventBus {
  private readonly handlers = new Set<DomainEventHandler>();

  subscribe(handler: DomainEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: DomainEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
