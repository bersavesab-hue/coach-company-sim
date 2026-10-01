import type { GameSecond } from "../../core/units/Units.js";
import {
  CONTENT_VERSION,
  GAME_VERSION,
  SAVE_VERSION
} from "../../core/version/Versions.js";
import type { InMemoryRepositoryPersistentState } from "../../infrastructure/memory/InMemoryRepositoryBundle.js";
import type { SequentialRuntimeIdAllocatorState } from "../../infrastructure/runtime/SequentialRuntimeIdAllocator.js";
import type { SaveEnvelope } from "../schema/SaveEnvelope.js";
import { migrateFleetBases } from "../migrations/PlayableSaveMigration.js";

export interface PlayableSavePayload {
  readonly currentGameSecond: GameSecond;
  readonly realtimeRemainderMilliGameSeconds: number;
  readonly commandSequence: number;
  readonly idAllocator: SequentialRuntimeIdAllocatorState;
  readonly repositories: InMemoryRepositoryPersistentState;
}

export type PlayableSaveEnvelope =
  SaveEnvelope<PlayableSavePayload>;

export function buildPlayableSaveEnvelope(
  payload: PlayableSavePayload,
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
      (parsed.saveVersion !== 1 && parsed.saveVersion !== SAVE_VERSION) ||
      typeof parsed.createdAtIso !== "string" ||
      typeof parsed.savedAtIso !== "string" ||
      typeof parsed.payload !== "object" ||
      parsed.payload === null
    ) {
      return null;
    }

    const payload = parsed.payload as Partial<PlayableSavePayload>;
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

    const repositories = payload.repositories!;
    if (!Array.isArray(repositories.companies) || !Array.isArray(repositories.vehicles)) return null;
    if (parsed.saveVersion === 1) {
      const bases = migrateFleetBases(repositories.companies, repositories.vehicles, payload.currentGameSecond!);
      const vehicles = repositories.vehicles.map(vehicle => ({
        ...vehicle,
        depotStationId: vehicle.depotStationId ?? repositories.companies.find(c => c.id === vehicle.companyId)?.homeStationId ?? null
      }));
      return { ...parsed, saveVersion: SAVE_VERSION, payload: { ...payload, repositories: { ...repositories, fleetBases: bases, vehicles } } } as PlayableSaveEnvelope;
    }
    if (!Array.isArray(repositories.fleetBases) || repositories.fleetBases.some(base =>
      !base || !Number.isSafeInteger(base.level) || base.level < 1 ||
      !Number.isSafeInteger(base.dailyLeaseCents) || Number(base.dailyLeaseCents) < 0 ||
      !Number.isSafeInteger(base.openedAtGameSecond) || Number(base.openedAtGameSecond) < 0
    )) return null;
    return parsed as PlayableSaveEnvelope;
  } catch {
    return null;
  }
}
