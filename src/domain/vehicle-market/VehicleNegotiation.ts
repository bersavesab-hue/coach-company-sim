import type { MoneyCents } from "../../core/units/Units.js";

export type VehicleNegotiationStatus = "accepted" | "countered";

export interface VehicleNegotiationResult {
  readonly status: VehicleNegotiationStatus;
  readonly agreedPriceCents: MoneyCents | null;
  readonly counterPriceCents: MoneyCents | null;
}
