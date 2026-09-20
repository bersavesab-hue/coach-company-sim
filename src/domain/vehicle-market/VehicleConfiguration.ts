import type {
  CompanyId,
  VehicleConfigurationId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type { MoneyCents } from "../../core/units/Units.js";

export interface VehicleConfiguration {
  readonly id: VehicleConfigurationId;
  readonly variantId: VehicleVariantId;
  readonly createdByCompanyId: CompanyId | null;
  readonly customName: string | null;
  readonly selectedOptionCodes: readonly string[];
  readonly seatCapacity: number;
  readonly energyCapacityUnits: number;
  readonly luggageCapacityL: number;
  readonly comfortPermille: number;
  readonly priceAdjustmentCents: MoneyCents;
  readonly exteriorColorCode: string | null;
  readonly liveryCode: string | null;
  readonly active: boolean;
}
