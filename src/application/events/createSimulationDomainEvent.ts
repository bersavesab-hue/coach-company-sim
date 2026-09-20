import type {
  AggregateType,
  DomainEventEnvelope
} from "../../contracts/events/DomainEventEnvelope.js";
import type { DomainEventType } from "../../contracts/events/EventTypes.js";
import { ids } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";

export function createSimulationDomainEvent<
  TType extends DomainEventType,
  TPayload
>(
  type: TType,
  aggregateType: AggregateType,
  aggregateId: string,
  gameSecond: GameSecond,
  payload: TPayload
): DomainEventEnvelope<TType, TPayload> {
  const normalizedType = type.replaceAll(".", "_");
  const normalizedAggregate = aggregateId.replaceAll(".", "_");

  return {
    eventId: ids.event(
      `event.sim.${normalizedType}.${normalizedAggregate}.${Number(gameSecond)}`
    ),
    type,
    gameSecond,
    aggregateType,
    aggregateId,
    payload
  };
}
