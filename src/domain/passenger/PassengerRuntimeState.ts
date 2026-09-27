import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";

export interface PassengerQueueGroup {
  readonly destinationStationId: StationId;
  readonly count: number;
}

interface DailyOdFlowSnapshot {
  readonly key: string;
  readonly count: number;
}

export interface PassengerRuntimeStateSnapshot {
  readonly lastGeneratedGameSecond: GameSecond;
  readonly waiting: readonly {
    readonly originStationId: StationId;
    readonly destinationStationId: StationId;
    readonly count: number;
  }[];
  readonly demandRemainders: readonly {
    readonly key: string;
    readonly value: number;
  }[];
  readonly dailyGenerated?: readonly DailyOdFlowSnapshot[];
  readonly dailyAbandoned?: readonly DailyOdFlowSnapshot[];
}

export class PassengerRuntimeState {
  private readonly waiting = new Map<StationId, Map<StationId, number>>();
  private readonly demandRemainders = new Map<string, number>();
  private readonly dailyGenerated = new Map<string, number>();
  private readonly dailyAbandoned = new Map<string, number>();
  private lastGenerated: GameSecond;

  constructor(lastGeneratedGameSecond: GameSecond = units.gameSecond(0)) {
    this.lastGenerated = lastGeneratedGameSecond;
  }

  static fromSnapshot(
    snapshot: PassengerRuntimeStateSnapshot
  ): PassengerRuntimeState {
    const state = new PassengerRuntimeState(
      snapshot.lastGeneratedGameSecond
    );
    for (const item of snapshot.waiting) {
      state.addWaiting(
        item.originStationId,
        item.destinationStationId,
        item.count
      );
    }
    for (const item of snapshot.demandRemainders) {
      state.demandRemainders.set(item.key, item.value);
    }
    for (const item of snapshot.dailyGenerated ?? []) {
      state.dailyGenerated.set(item.key, item.count);
    }
    for (const item of snapshot.dailyAbandoned ?? []) {
      state.dailyAbandoned.set(item.key, item.count);
    }
    return state;
  }

  snapshot(): PassengerRuntimeStateSnapshot {
    const waiting: Array<{
      originStationId: StationId;
      destinationStationId: StationId;
      count: number;
    }> = [];
    for (const [originStationId, queue] of this.waiting.entries()) {
      for (const [destinationStationId, count] of queue.entries()) {
        waiting.push({
          originStationId,
          destinationStationId,
          count
        });
      }
    }
    return {
      lastGeneratedGameSecond: this.lastGenerated,
      waiting,
      demandRemainders: [...this.demandRemainders.entries()].map(
        ([key, value]) => ({ key, value })
      ),
      dailyGenerated: [...this.dailyGenerated.entries()].map(
        ([key, count]) => ({ key, count })
      ),
      dailyAbandoned: [...this.dailyAbandoned.entries()].map(
        ([key, count]) => ({ key, count })
      )
    };
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
    validateCount(count, "Passenger waiting count");
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
    validateCount(maxCount, "Passenger take count");

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
    validateCount(value, "Demand remainder");
    this.demandRemainders.set(
      odKey(originStationId, destinationStationId),
      value
    );
  }

  recordGenerated(
    gameDay: number,
    originStationId: StationId,
    destinationStationId: StationId,
    count: number
  ): void {
    this.recordDailyFlow(
      this.dailyGenerated,
      gameDay,
      originStationId,
      destinationStationId,
      count
    );
  }

  recordAbandoned(
    gameDay: number,
    originStationId: StationId,
    destinationStationId: StationId,
    count: number
  ): void {
    this.recordDailyFlow(
      this.dailyAbandoned,
      gameDay,
      originStationId,
      destinationStationId,
      count
    );
  }

  generatedCount(
    gameDay: number,
    originStationId: StationId,
    destinationStationId: StationId
  ): number {
    return this.dailyGenerated.get(
      dailyOdKey(gameDay, originStationId, destinationStationId)
    ) ?? 0;
  }

  abandonedCount(
    gameDay: number,
    originStationId: StationId,
    destinationStationId: StationId
  ): number {
    return this.dailyAbandoned.get(
      dailyOdKey(gameDay, originStationId, destinationStationId)
    ) ?? 0;
  }

  pruneDailyFlowBeforeDay(minGameDay: number): void {
    for (const map of [this.dailyGenerated, this.dailyAbandoned]) {
      for (const key of map.keys()) {
        const separator = key.indexOf(":");
        const day = Number(key.slice(0, separator));
        if (day < minGameDay) map.delete(key);
      }
    }
  }

  private recordDailyFlow(
    map: Map<string, number>,
    gameDay: number,
    originStationId: StationId,
    destinationStationId: StationId,
    count: number
  ): void {
    validateCount(gameDay, "Game day");
    validateCount(count, "Passenger flow count");
    if (gameDay < 1 || count === 0) return;

    const key = dailyOdKey(
      gameDay,
      originStationId,
      destinationStationId
    );
    map.set(key, (map.get(key) ?? 0) + count);
  }
}

function validateCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
}

function odKey(
  originStationId: StationId,
  destinationStationId: StationId
): string {
  return `${originStationId}->${destinationStationId}`;
}

function dailyOdKey(
  gameDay: number,
  originStationId: StationId,
  destinationStationId: StationId
): string {
  return `${gameDay}:${odKey(originStationId, destinationStationId)}`;
}
