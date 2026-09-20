import type { MoneyCents } from "../../core/units/Units.js";

export interface VehicleOptionDefinition {
  readonly code: string;
  readonly name: string;
  readonly priceDeltaCents: MoneyCents;
  readonly seatCapacityDelta: number;
  readonly energyCapacityUnitsDelta: number;
  readonly luggageCapacityLDelta: number;
  readonly comfortPermilleDelta: number;
  readonly mutuallyExclusiveGroup: string | null;
  readonly active: boolean;
}
