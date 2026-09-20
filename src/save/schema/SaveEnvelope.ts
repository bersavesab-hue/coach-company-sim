import type { SaveVersion } from "./SaveVersion.js";

export interface SaveEnvelope<TPayload> {
  readonly saveVersion: SaveVersion;
  readonly gameVersion: string;
  readonly contentVersion: number;
  readonly createdAtIso: string;
  readonly savedAtIso: string;
  readonly payload: TPayload;
}
