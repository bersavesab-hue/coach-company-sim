import type { GameSecond } from "../../core/units/Units.js";
import {
  CONTENT_VERSION,
  GAME_VERSION,
  SAVE_VERSION
} from "../../core/version/Versions.js";
import type { InMemoryRepositoryPersistentState } from "../../infrastructure/memory/InMemoryRepositoryBundle.js";
import type { SequentialRuntimeIdAllocatorState } from "../../infrastructure/runtime/SequentialRuntimeIdAllocator.js";
import type { SaveEnvelope } from "../schema/SaveEnvelope.js";

export interface PlayableSavePayloadV1 {
  readonly currentGameSecond: GameSecond;
  readonly realtimeRemainderMilliGameSeconds: number;
  readonly commandSequence: number;
  readonly idAllocator: SequentialRuntimeIdAllocatorState;
  readonly repositories: InMemoryRepositoryPersistentState;
}

export type PlayableSaveEnvelope =
  SaveEnvelope<PlayableSavePayloadV1>;

export function buildPlayableSaveEnvelope(
  payload: PlayableSavePayloadV1,
  createdAtIso: string
): PlayableSaveEnvelope {
  return {
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    contentVersion: CONTENT_VERSION,
    createdAtIso,
    savedAtIso: new Date().toISOString(),
    payload
  };
}

export function parsePlayableSave(
  raw: string
): PlayableSaveEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PlayableSaveEnvelope>;
    if (
      parsed.saveVersion !== SAVE_VERSION ||
      typeof parsed.createdAtIso !== "string" ||
      typeof parsed.savedAtIso !== "string" ||
      typeof parsed.payload !== "object" ||
      parsed.payload === null
    ) {
      return null;
    }

    const payload = parsed.payload as Partial<PlayableSavePayloadV1>;
    if (
      !Number.isSafeInteger(payload.currentGameSecond) ||
      Number(payload.currentGameSecond) < 0 ||
      !Number.isSafeInteger(payload.realtimeRemainderMilliGameSeconds) ||
      Number(payload.realtimeRemainderMilliGameSeconds) < 0 ||
      !Number.isSafeInteger(payload.commandSequence) ||
      Number(payload.commandSequence) < 1 ||
      typeof payload.idAllocator !== "object" ||
      payload.idAllocator === null ||
      typeof payload.repositories !== "object" ||
      payload.repositories === null
    ) {
      return null;
    }

    return parsed as PlayableSaveEnvelope;
  } catch {
    return null;
  }
}
