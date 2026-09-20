import type { CommandId, EventId } from "../ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { DomainEventType } from "./EventTypes.js";

export type AggregateType =
  | "company"
  | "vehicle"
  | "vehicleMarket"
  | "route"
  | "servicePlan"
  | "trip"
  | "station"
  | "staff"
  | "finance"
  | "passenger"
  | "world";

export interface DomainEventEnvelope<
  TType extends DomainEventType = DomainEventType,
  TPayload = unknown
> {
  readonly eventId: EventId;
  readonly type: TType;
  readonly gameSecond: GameSecond;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  readonly causedByCommandId?: CommandId;
  readonly payload: TPayload;
}
