import type {
  VehicleModelId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type { MoneyCents } from "../../core/units/Units.js";

export interface VehicleVariant {
  readonly id: VehicleVariantId;
  readonly modelId: VehicleModelId;
  readonly name: string;
  readonly modelYear: number;
  readonly basePriceCents: MoneyCents;
  readonly standardSeatCapacity: number;
  readonly standardEnergyCapacityUnits: number;
  readonly standardLuggageCapacityL: number;
  readonly standardComfortPermille: number;
  readonly allowedOptionCodes: readonly string[];
  readonly active: boolean;
}
