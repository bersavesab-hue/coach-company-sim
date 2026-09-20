import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import type { DomainEventEnvelope } from "../../src/contracts/events/DomainEventEnvelope.js";
import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";

test("command and event envelopes keep stable metadata", () => {
  const command: CommandEnvelope<"trip.prepare", { routeId: string }> = {
    commandId: ids.command("command.00000001"),
    type: "trip.prepare",
    issuedAtGameSecond: units.gameSecond(100),
    payload: { routeId: "route.00000001" }
  };

  const event: DomainEventEnvelope<"trip.created", { tripId: string }> = {
    eventId: ids.event("event.000000000001"),
    type: "trip.created",
    gameSecond: units.gameSecond(101),
    aggregateType: "trip",
    aggregateId: "trip.000000000001",
    causedByCommandId: command.commandId,
    payload: { tripId: "trip.000000000001" }
  };

  assert.equal(event.causedByCommandId, command.commandId);
});
