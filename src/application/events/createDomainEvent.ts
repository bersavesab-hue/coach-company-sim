import type {
  AggregateType,
  DomainEventEnvelope
} from "../../contracts/events/DomainEventEnvelope.js";
import type { DomainEventType } from "../../contracts/events/EventTypes.js";
import type { CommandEnvelope } from "../../contracts/commands/CommandEnvelope.js";
import { deriveEventId } from "../../contracts/ids/EntityIds.js";

export function createDomainEvent<
  TType extends DomainEventType,
  TPayload
>(
  command: CommandEnvelope,
  type: TType,
  aggregateType: AggregateType,
  aggregateId: string,
  payload: TPayload,
  ordinal = 1
): DomainEventEnvelope<TType, TPayload> {
  return {
    eventId: deriveEventId(command.commandId, ordinal),
    type,
    gameSecond: command.issuedAtGameSecond,
    aggregateType,
    aggregateId,
    causedByCommandId: command.commandId,
    payload
  };
}
