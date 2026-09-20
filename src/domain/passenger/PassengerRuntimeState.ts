import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";

export interface PassengerQueueGroup {
  readonly destinationStationId: StationId;
  readonly count: number;
}

export class PassengerRuntimeState {
  private readonly waiting = new Map<StationId, Map<StationId, number>>();
  private readonly demandRemainders = new Map<string, number>();
  private lastGenerated: GameSecond;

  constructor(lastGeneratedGameSecond: GameSecond = units.gameSecond(0)) {
    this.lastGenerated = lastGeneratedGameSecond;
  }

  lastDemandGeneratedGameSecond(): GameSecond {
    return this.lastGenerated;
  }

  setLastDemandGeneratedGameSecond(value: GameSecond): void {
    this.lastGenerated = value;
  }

  waitingCount(
    originStationId: StationId,
    destinationStationId: StationId
  ): number {
    return (
      this.waiting.get(originStationId)?.get(destinationStationId) ?? 0
    );
  }

  queueAt(originStationId: StationId): readonly PassengerQueueGroup[] {
    const queue = this.waiting.get(originStationId);
    if (!queue) return [];

    return [...queue.entries()]
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([destinationStationId, count]) => ({
        destinationStationId,
        count
      }));
  }

  addWaiting(
    originStationId: StationId,
    destinationStationId: StationId,
    count: number
  ): void {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Passenger waiting count must be a non-negative integer");
    }
    if (count === 0) return;

    let queue = this.waiting.get(originStationId);
    if (!queue) {
      queue = new Map<StationId, number>();
      this.waiting.set(originStationId, queue);
    }

    queue.set(
      destinationStationId,
      (queue.get(destinationStationId) ?? 0) + count
    );
  }

  takeWaiting(
    originStationId: StationId,
    destinationStationId: StationId,
    maxCount: number
  ): number {
    if (!Number.isSafeInteger(maxCount) || maxCount < 0) {
      throw new Error("Passenger take count must be a non-negative integer");
    }

    const queue = this.waiting.get(originStationId);
    const current = queue?.get(destinationStationId) ?? 0;
    const taken = Math.min(current, maxCount);

    if (queue && taken > 0) {
      const remaining = current - taken;
      if (remaining === 0) {
        queue.delete(destinationStationId);
      } else {
        queue.set(destinationStationId, remaining);
      }
      if (queue.size === 0) {
        this.waiting.delete(originStationId);
      }
    }

    return taken;
  }

  demandRemainder(
    originStationId: StationId,
    destinationStationId: StationId
  ): number {
    return this.demandRemainders.get(
      odKey(originStationId, destinationStationId)
    ) ?? 0;
  }

  setDemandRemainder(
    originStationId: StationId,
    destinationStationId: StationId,
    value: number
  ): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("Demand remainder must be a non-negative integer");
    }
    this.demandRemainders.set(
      odKey(originStationId, destinationStationId),
      value
    );
  }
}

function odKey(
  originStationId: StationId,
  destinationStationId: StationId
): string {
  return `${originStationId}->${destinationStationId}`;
}
