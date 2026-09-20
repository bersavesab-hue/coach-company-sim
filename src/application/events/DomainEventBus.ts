import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";

export type DomainEventSubscriber = (
  event: DomainEventEnvelope
) => void;

export class DomainEventBus {
  private readonly subscribers = new Set<DomainEventSubscriber>();

  subscribe(subscriber: DomainEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  publish(event: DomainEventEnvelope): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }
}
