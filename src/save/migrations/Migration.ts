import type { SaveEnvelope } from "../schema/SaveEnvelope.js";

export interface SaveMigration<TFrom = unknown, TTo = unknown> {
  readonly fromVersion: number;
  readonly toVersion: number;

  migrate(
    save: SaveEnvelope<TFrom>
  ): SaveEnvelope<TTo>;
}
