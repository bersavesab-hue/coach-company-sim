import type {
  VehicleModelContentRecord,
  VehicleVariantContentRecord
} from "./VehicleContentTypes.js";
import {
  ALL_VEHICLE_OPTION_CODES
} from "./VehicleOptionCodes.js";

export interface VehicleVariantContentIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleVariantValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleVariantContentIssue[];
  readonly counts: {
    readonly models: number;
    readonly variants: number;
    readonly modelsWithVariant: number;
  };
}

export function validateVehicleVariantContent(input: {
  readonly models: readonly VehicleModelContentRecord[];
  readonly variants: readonly VehicleVariantContentRecord[];
  readonly expectedVariantCount?: number;
}): VehicleVariantValidationResult {
  const issues: VehicleVariantContentIssue[] = [];
  const modelById = new Map(
    input.models.map((record) => [
      String(record.model.id),
      record
    ])
  );
  const optionCodes = new Set<string>(
    ALL_VEHICLE_OPTION_CODES
  );
  const variantIds = new Set<string>();
  const variantsPerModel = new Map<string, number>();

  for (const record of input.variants) {
    const variant = record.variant;
    const lifecycle = record.lifecycle;
    const id = String(variant.id);
    const modelId = String(variant.modelId);

    if (variantIds.has(id)) {
      push(issues, "error", "DUPLICATE_VARIANT_ID", "Variant ID is duplicated", id);
    }
    variantIds.add(id);

    const model = modelById.get(modelId);
    if (!model) {
      push(issues, "error", "VARIANT_MODEL_NOT_FOUND", "Variant references unknown model", id);
      continue;
    }

    if (lifecycle.variantId !== variant.id) {
      push(issues, "error", "VARIANT_LIFECYCLE_ID_MISMATCH", "Lifecycle variantId must match variant.id", id);
    }
    if (!Number.isSafeInteger(Number(variant.basePriceCents)) || Number(variant.basePriceCents) <= 0) {
      push(issues, "error", "INVALID_VARIANT_PRICE", "Variant price must be positive", id);
    }
    if (!Number.isSafeInteger(variant.standardSeatCapacity) || variant.standardSeatCapacity <= 0) {
      push(issues, "error", "INVALID_VARIANT_SEATS", "Variant standard seats must be positive", id);
    }
    if (!Number.isSafeInteger(variant.standardEnergyCapacityUnits) || variant.standardEnergyCapacityUnits <= 0) {
      push(issues, "error", "INVALID_VARIANT_ENERGY", "Variant energy capacity must be positive", id);
    }
    if (!Number.isSafeInteger(variant.standardLuggageCapacityL) || variant.standardLuggageCapacityL < 0) {
      push(issues, "error", "INVALID_VARIANT_LUGGAGE", "Variant luggage capacity cannot be negative", id);
    }
    if (
      !Number.isSafeInteger(variant.standardComfortPermille) ||
      variant.standardComfortPermille < 0 ||
      variant.standardComfortPermille > 1000
    ) {
      push(issues, "error", "INVALID_VARIANT_COMFORT", "Variant comfort must be 0..1000", id);
    }
    if (variant.modelYear < model.identity.productionStartYear) {
      push(issues, "error", "VARIANT_YEAR_BEFORE_MODEL", "Variant model year predates base model", id);
    }

    const uniqueOptions = new Set(variant.allowedOptionCodes);
    if (uniqueOptions.size !== variant.allowedOptionCodes.length) {
      push(issues, "error", "DUPLICATE_VARIANT_OPTION", "Variant contains duplicate option codes", id);
    }
    for (const code of variant.allowedOptionCodes) {
      if (!optionCodes.has(code)) {
        push(issues, "error", "UNKNOWN_VARIANT_OPTION", `Variant references unknown planned option code: ${code}`, id);
      }
    }

    if (lifecycle.launchGameDay < 1) {
      push(issues, "error", "INVALID_VARIANT_LAUNCH", "Variant launch day must be >= 1", id);
    }
    if (
      lifecycle.productionEndGameDay !== null &&
      lifecycle.productionEndGameDay <= lifecycle.launchGameDay
    ) {
      push(issues, "error", "INVALID_VARIANT_END", "Production end must be after launch", id);
    }
    if (
      lifecycle.dealerClearanceEndGameDay !== null &&
      (
        lifecycle.productionEndGameDay === null ||
        lifecycle.dealerClearanceEndGameDay <
          lifecycle.productionEndGameDay
      )
    ) {
      push(issues, "error", "INVALID_VARIANT_CLEARANCE", "Dealer clearance must follow production end", id);
    }

    const seatRatio =
      variant.standardSeatCapacity /
      model.model.seatCapacity;
    if (seatRatio < 0.6 || seatRatio > 1.2) {
      push(issues, "warning", "SUSPICIOUS_VARIANT_SEAT_RATIO", "Variant seats differ sharply from base model", id);
    }
    const energyRatio =
      variant.standardEnergyCapacityUnits /
      model.model.energyCapacityUnits;
    if (energyRatio < 0.8 || energyRatio > 1.35) {
      push(issues, "warning", "SUSPICIOUS_VARIANT_ENERGY_RATIO", "Variant energy capacity differs sharply from base model", id);
    }

    variantsPerModel.set(
      modelId,
      (variantsPerModel.get(modelId) ?? 0) + 1
    );
  }

  for (const model of input.models) {
    const count =
      variantsPerModel.get(String(model.model.id)) ?? 0;
    if (count < 1 || count > 3) {
      push(
        issues,
        "error",
        "INVALID_VARIANTS_PER_MODEL",
        `Each base model requires 1..3 variants, found ${count}`,
        String(model.model.id)
      );
    }
  }

  if (
    input.expectedVariantCount !== undefined &&
    input.variants.length !== input.expectedVariantCount
  ) {
    push(
      issues,
      "error",
      "UNEXPECTED_VARIANT_COUNT",
      `Expected ${input.expectedVariantCount} variants but found ${input.variants.length}`,
      null
    );
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    counts: {
      models: input.models.length,
      variants: input.variants.length,
      modelsWithVariant: variantsPerModel.size
    }
  };
}

function push(
  issues: VehicleVariantContentIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({ severity, code, message, ref });
}
