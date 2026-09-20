import type { CompanyId, VehicleConfigurationId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import { units } from "../../core/units/Units.js";
import type { VehicleConfiguration } from "./VehicleConfiguration.js";
import type { VehicleOptionDefinition } from "./VehicleOptionDefinition.js";
import type { VehicleVariant } from "./VehicleVariant.js";

export interface CreateVehicleConfigurationInput {
  readonly id: VehicleConfigurationId;
  readonly variant: VehicleVariant;
  readonly createdByCompanyId: CompanyId | null;
  readonly customName: string | null;
  readonly selectedOptions: readonly VehicleOptionDefinition[];
  readonly exteriorColorCode: string | null;
  readonly liveryCode: string | null;
}

export function createVehicleConfiguration(
  input: CreateVehicleConfigurationInput
): Result<VehicleConfiguration, DomainError> {
  if (!input.variant.active) {
    return err(new DomainError(
      "ENTITY_INACTIVE",
      "Vehicle variant is inactive",
      { variantId: input.variant.id }
    ));
  }

  const codes = input.selectedOptions.map((option) => option.code);
  if (new Set(codes).size !== codes.length) {
    return err(new DomainError(
      "INVALID_ARGUMENT",
      "Vehicle configuration contains duplicate options"
    ));
  }

  const allowed = new Set(input.variant.allowedOptionCodes);
  for (const option of input.selectedOptions) {
    if (!option.active || !allowed.has(option.code)) {
      return err(new DomainError(
        "INVALID_ARGUMENT",
        "Vehicle option is inactive or not allowed by this variant",
        { optionCode: option.code, variantId: input.variant.id }
      ));
    }
  }

  const exclusive = new Set<string>();
  for (const option of input.selectedOptions) {
    if (option.mutuallyExclusiveGroup === null) continue;
    if (exclusive.has(option.mutuallyExclusiveGroup)) {
      return err(new DomainError(
        "INVALID_ARGUMENT",
        "Vehicle configuration contains mutually exclusive options",
        { group: option.mutuallyExclusiveGroup }
      ));
    }
    exclusive.add(option.mutuallyExclusiveGroup);
  }

  const seatCapacity =
    input.variant.standardSeatCapacity +
    input.selectedOptions.reduce((sum, item) => sum + item.seatCapacityDelta, 0);
  const energyCapacityUnits =
    input.variant.standardEnergyCapacityUnits +
    input.selectedOptions.reduce(
      (sum, item) => sum + item.energyCapacityUnitsDelta,
      0
    );
  const luggageCapacityL =
    input.variant.standardLuggageCapacityL +
    input.selectedOptions.reduce(
      (sum, item) => sum + item.luggageCapacityLDelta,
      0
    );
  const comfortPermille =
    input.variant.standardComfortPermille +
    input.selectedOptions.reduce(
      (sum, item) => sum + item.comfortPermilleDelta,
      0
    );

  if (
    !Number.isSafeInteger(seatCapacity) ||
    seatCapacity <= 0 ||
    !Number.isSafeInteger(energyCapacityUnits) ||
    energyCapacityUnits <= 0 ||
    !Number.isSafeInteger(luggageCapacityL) ||
    luggageCapacityL < 0 ||
    !Number.isSafeInteger(comfortPermille) ||
    comfortPermille < 0 ||
    comfortPermille > 1000
  ) {
    return err(new DomainError(
      "INVALID_ARGUMENT",
      "Vehicle configuration resolves to invalid physical specifications",
      {
        seatCapacity,
        energyCapacityUnits,
        luggageCapacityL,
        comfortPermille
      }
    ));
  }

  return ok({
    id: input.id,
    variantId: input.variant.id,
    createdByCompanyId: input.createdByCompanyId,
    customName: input.customName,
    selectedOptionCodes: codes,
    seatCapacity,
    energyCapacityUnits,
    luggageCapacityL,
    comfortPermille,
    priceAdjustmentCents: units.moneyCents(
      input.selectedOptions.reduce(
        (sum, item) => sum + Number(item.priceDeltaCents),
        0
      )
    ),
    exteriorColorCode: input.exteriorColorCode,
    liveryCode: input.liveryCode,
    active: true
  });
}
