import type { VehicleOptionDefinition } from "../../domain/vehicle-market/VehicleOptionDefinition.js";
import type {
  VehicleModelContentRecord,
  VehicleVariantContentRecord
} from "./VehicleContentTypes.js";
import {
  ALL_VEHICLE_OPTION_CODES
} from "./VehicleOptionCodes.js";

export interface VehicleOptionContentIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleOptionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleOptionContentIssue[];
  readonly counts: {
    readonly definitions: number;
    readonly referencedCodes: number;
  };
}

const ALLOWED_EXCLUSIVE_GROUPS = new Set([
  "seat_layout",
  "energy_package",
  "luggage_package",
  "climate_package",
  "paint_finish"
]);

export function validateVehicleOptionContent(input: {
  readonly models: readonly VehicleModelContentRecord[];
  readonly variants: readonly VehicleVariantContentRecord[];
  readonly options: readonly VehicleOptionDefinition[];
  readonly expectedOptionCount?: number;
}): VehicleOptionValidationResult {
  const issues: VehicleOptionContentIssue[] = [];
  const frozenCodes = new Set<string>(
    ALL_VEHICLE_OPTION_CODES
  );
  const byCode = new Map<string, VehicleOptionDefinition>();

  for (const option of input.options) {
    if (byCode.has(option.code)) {
      push(
        issues,
        "error",
        "DUPLICATE_OPTION_CODE",
        "Vehicle option code is duplicated",
        option.code
      );
      continue;
    }
    byCode.set(option.code, option);

    if (!frozenCodes.has(option.code)) {
      push(
        issues,
        "error",
        "OPTION_CODE_NOT_FROZEN",
        "Vehicle option definition uses an unknown code",
        option.code
      );
    }
    if (option.name.trim().length === 0) {
      push(
        issues,
        "error",
        "OPTION_NAME_EMPTY",
        "Vehicle option name cannot be empty",
        option.code
      );
    }
    if (
      !Number.isSafeInteger(Number(option.priceDeltaCents)) ||
      Number(option.priceDeltaCents) < 0
    ) {
      push(
        issues,
        "error",
        "OPTION_PRICE_INVALID",
        "Vehicle option price must be a non-negative integer",
        option.code
      );
    }
    for (const [field, value] of [
      ["seatCapacityDelta", option.seatCapacityDelta],
      [
        "energyCapacityUnitsDelta",
        option.energyCapacityUnitsDelta
      ],
      [
        "luggageCapacityLDelta",
        option.luggageCapacityLDelta
      ],
      ["comfortPermilleDelta", option.comfortPermilleDelta]
    ] as const) {
      if (!Number.isSafeInteger(value)) {
        push(
          issues,
          "error",
          "OPTION_DELTA_NOT_INTEGER",
          `${field} must be an integer`,
          option.code
        );
      }
    }
    if (
      option.mutuallyExclusiveGroup !== null &&
      !ALLOWED_EXCLUSIVE_GROUPS.has(
        option.mutuallyExclusiveGroup
      )
    ) {
      push(
        issues,
        "error",
        "OPTION_EXCLUSIVE_GROUP_UNKNOWN",
        "Vehicle option uses an unknown mutually exclusive group",
        option.code
      );
    }
  }

  for (const code of frozenCodes) {
    if (!byCode.has(code)) {
      push(
        issues,
        "error",
        "OPTION_DEFINITION_MISSING",
        "Frozen vehicle option code has no formal definition",
        code
      );
    }
  }

  const modelById = new Map(
    input.models.map((record) => [
      String(record.model.id),
      record
    ])
  );
  const referencedCodes = new Set<string>();

  for (const record of input.variants) {
    const variant = record.variant;
    const model = modelById.get(String(variant.modelId));
    if (!model) continue;

    for (const code of variant.allowedOptionCodes) {
      referencedCodes.add(code);
      const option = byCode.get(code);
      if (!option) {
        push(
          issues,
          "error",
          "VARIANT_OPTION_UNDEFINED",
          "Variant references an option without definition",
          String(variant.id)
        );
        continue;
      }

      const resolvedSeats =
        variant.standardSeatCapacity +
        option.seatCapacityDelta;
      const resolvedEnergy =
        variant.standardEnergyCapacityUnits +
        option.energyCapacityUnitsDelta;
      const resolvedLuggage =
        variant.standardLuggageCapacityL +
        option.luggageCapacityLDelta;
      const resolvedComfort =
        variant.standardComfortPermille +
        option.comfortPermilleDelta;

      if (
        resolvedSeats <= 0 ||
        resolvedEnergy <= 0 ||
        resolvedLuggage < 0 ||
        resolvedComfort < 0 ||
        resolvedComfort > 1000
      ) {
        push(
          issues,
          "error",
          "OPTION_INVALID_FOR_VARIANT",
          `Option ${code} creates invalid physical specifications`,
          String(variant.id)
        );
      }

      if (
        model.model.energyKind === "electric_wh" &&
        code === "energy_lightweight"
      ) {
        push(
          issues,
          "error",
          "ELECTRIC_LIGHTWEIGHT_FUEL_OPTION",
          "Electric variants must not expose the combustion lightweight energy package",
          String(variant.id)
        );
      }
    }
  }

  if (
    input.expectedOptionCount !== undefined &&
    input.options.length !== input.expectedOptionCount
  ) {
    push(
      issues,
      "error",
      "UNEXPECTED_OPTION_COUNT",
      `Expected ${input.expectedOptionCount} vehicle options but found ${input.options.length}`,
      null
    );
  }

  return {
    valid: issues.every(
      (issue) => issue.severity !== "error"
    ),
    issues,
    counts: {
      definitions: input.options.length,
      referencedCodes: referencedCodes.size
    }
  };
}

function push(
  issues: VehicleOptionContentIssue[],
  severity: "error" | "warning",
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({
    severity,
    code,
    message,
    ref
  });
}
