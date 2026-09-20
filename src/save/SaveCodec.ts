import { SAVE_VERSION } from "../core/version.js";

export interface SaveEnvelope<T> {
  saveVersion: number;
  savedAtIso: string;
  payload: T;
}

export function encodeSave<T>(payload: T): string {
  const envelope: SaveEnvelope<T> = {
    saveVersion: SAVE_VERSION,
    savedAtIso: new Date().toISOString(),
    payload
  };

  return JSON.stringify(envelope);
}

export function decodeSave<T>(raw: string): T {
  const envelope = JSON.parse(raw) as SaveEnvelope<T>;

  if (envelope.saveVersion !== SAVE_VERSION) {
    throw new Error(
      `Unsupported saveVersion ${envelope.saveVersion}; expected ${SAVE_VERSION}`
    );
  }

  return envelope.payload;
}
