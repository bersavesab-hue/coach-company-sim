import type {
  FarePolicyId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type { MoneyCents } from "../../core/units/Units.js";

export type FareRoundingMode = "floor" | "nearest" | "ceil";

export interface FarePairOverride {
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly fareCents: MoneyCents;
}

export interface FarePolicy {
  readonly id: FarePolicyId;
  readonly baseFareCents: MoneyCents;
  readonly perKmCents: MoneyCents;
  readonly minimumFareCents: MoneyCents;
  readonly maximumFareCents: MoneyCents | null;
  readonly roundingIncrementCents: number;
  readonly roundingMode: FareRoundingMode;
  readonly pairOverrides: readonly FarePairOverride[];
}
