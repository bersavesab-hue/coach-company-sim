import type { VehicleBrandContentRecord, VehicleModelContentRecord, VehicleSeriesContentRecord } from "./VehicleContentTypes.js";
import { vehicleUnlockRuleForTier } from "./VehicleUnlockRules.js";

export type VehicleContentIssueSeverity = "error" | "warning";

export interface VehicleContentIssue {
  readonly severity: VehicleContentIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly ref: string | null;
}

export interface VehicleContentValidationResult {
  readonly valid: boolean;
  readonly issues: readonly VehicleContentIssue[];
  readonly counts: {
    readonly brands: number;
    readonly series: number;
    readonly models: number;
    readonly plannedModels: number;
  };
}

export interface VehicleContentValidationInput {
  readonly brands: readonly VehicleBrandContentRecord[];
  readonly series: readonly VehicleSeriesContentRecord[];
  readonly models: readonly VehicleModelContentRecord[];
  readonly expectedModelCount?: number;
}

export function validateVehicleContent(
  input: VehicleContentValidationInput
): VehicleContentValidationResult {
  const issues: VehicleContentIssue[] = [];
  const brandIds = new Set<string>();
  const seriesIds = new Set<string>();
  const modelIds = new Set<string>();
  const brandNames = new Set<string>();
  const modelNames = new Set<string>();

  for (const record of input.brands) {
    unique(brandIds, String(record.brand.id), "DUPLICATE_BRAND_ID", issues);
    unique(brandNames, record.brand.name, "DUPLICATE_BRAND_NAME", issues);
  }

  for (const record of input.series) {
    const id = String(record.series.id);
    unique(seriesIds, id, "DUPLICATE_SERIES_ID", issues);
    if (!brandIds.has(String(record.series.brandId))) {
      error(
        issues,
        "SERIES_BRAND_NOT_FOUND",
        `Series ${id} references unknown brand ${record.series.brandId}`,
        id
      );
    }
    if (!Number.isSafeInteger(record.plannedModelCount) || record.plannedModelCount <= 0) {
      error(issues, "INVALID_PLANNED_MODEL_COUNT", "Series plannedModelCount must be positive", id);
    }
  }

  const modelsPerSeries = new Map<string, number>();
  const technicalSignatures = new Map<string, string>();

  for (const record of input.models) {
    const model = record.model;
    const identity = record.identity;
    const metadata = record.metadata;
    const id = String(model.id);

    unique(modelIds, id, "DUPLICATE_MODEL_ID", issues);
    unique(modelNames, identity.displayName, "DUPLICATE_MODEL_NAME", issues);

    if (identity.modelId !== model.id || metadata.modelId !== model.id) {
      error(issues, "MODEL_IDENTITY_MISMATCH", "Model, identity and metadata IDs must match", id);
    }
    if (identity.seriesId !== metadata.seriesId) {
      error(issues, "MODEL_SERIES_MISMATCH", "Identity and metadata series IDs must match", id);
    }
    if (!seriesIds.has(String(identity.seriesId))) {
      error(issues, "MODEL_SERIES_NOT_FOUND", `Model references unknown series ${identity.seriesId}`, id);
    }
    if (model.serviceClass !== metadata.role) {
      error(issues, "MODEL_ROLE_MISMATCH", "VehicleModel.serviceClass must equal content role", id);
    }

    positive(model.seatCapacity, "seatCapacity", id, issues);
    positive(Number(model.maxSpeedMps), "maxSpeedMps", id, issues);
    positive(model.energyCapacityUnits, "energyCapacityUnits", id, issues);
    positive(model.minimumDispatchEnergyUnits, "minimumDispatchEnergyUnits", id, issues);
    positive(model.drivingEnergyUnitsPer100Km, "drivingEnergyUnitsPer100Km", id, issues);
    positive(model.idleEnergyUnitsPerHour, "idleEnergyUnitsPerHour", id, issues);
    positive(model.serviceIntervalM, "serviceIntervalM", id, issues);

    if (model.minimumDispatchEnergyUnits >= model.energyCapacityUnits) {
      error(issues, "INVALID_DISPATCH_RESERVE", "Minimum dispatch energy must be below total capacity", id);
    }
    if (Number(model.maxSpeedMps) < 18 || Number(model.maxSpeedMps) > 36) {
      warning(issues, "SUSPICIOUS_MAX_SPEED", "Vehicle max speed is outside expected coach range", id);
    }
    if (model.seatCapacity > 70) {
      warning(issues, "SUSPICIOUS_SEAT_CAPACITY", "Seat capacity is unusually high", id);
    }

    const seriesRecord = input.series.find(
      (value) => value.series.id === identity.seriesId
    );
    if (seriesRecord) {
      if (metadata.unlock.tier < seriesRecord.baseUnlockTier) {
        error(issues, "MODEL_UNLOCK_BEFORE_SERIES", "Model unlock tier cannot be earlier than its series", id);
      }
      const tierFloor = vehicleUnlockRuleForTier(metadata.unlock.tier);
      if (
        metadata.unlock.earliestGameDay < tierFloor.earliestGameDay ||
        metadata.unlock.minimumReputationPermille < tierFloor.minimumReputationPermille ||
        metadata.unlock.minimumOwnedVehicleCount < tierFloor.minimumOwnedVehicleCount
      ) {
        error(issues, "MODEL_UNLOCK_BELOW_TIER_FLOOR", "Model unlock cannot be easier than its tier floor", id);
      }
    }

    const sid = String(identity.seriesId);
    modelsPerSeries.set(sid, (modelsPerSeries.get(sid) ?? 0) + 1);

    const signature = [
      model.serviceClass,
      model.seatCapacity,
      Number(model.maxSpeedMps),
      model.energyKind,
      model.energyCapacityUnits,
      model.minimumDispatchEnergyUnits,
      model.drivingEnergyUnitsPer100Km,
      model.idleEnergyUnitsPerHour,
      model.serviceIntervalM,
      model.powertrainWearPermillePer1000Km,
      model.brakeWearPermillePer1000Km,
      model.tireWearPermillePer1000Km
    ].join("|");
    const previous = technicalSignatures.get(signature);
    if (previous) {
      warning(
        issues,
        "DUPLICATE_TECHNICAL_MODEL",
        `Model has identical technical signature to ${previous}`,
        id
      );
    } else {
      technicalSignatures.set(signature, id);
    }
  }

  for (const record of input.series) {
    const actual = modelsPerSeries.get(String(record.series.id)) ?? 0;
    if (actual > record.plannedModelCount) {
      error(
        issues,
        "SERIES_MODEL_COUNT_EXCEEDED",
        `Series contains ${actual} models but plannedModelCount is ${record.plannedModelCount}`,
        String(record.series.id)
      );
    }
  }

  if (
    input.expectedModelCount !== undefined &&
    input.models.length !== input.expectedModelCount
  ) {
    error(
      issues,
      "UNEXPECTED_MODEL_COUNT",
      `Expected ${input.expectedModelCount} models but found ${input.models.length}`,
      null
    );
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    counts: {
      brands: input.brands.length,
      series: input.series.length,
      models: input.models.length,
      plannedModels: input.series.reduce(
        (sum, record) => sum + record.plannedModelCount,
        0
      )
    }
  };
}

function positive(
  value: number,
  field: string,
  ref: string,
  issues: VehicleContentIssue[]
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    error(issues, "INVALID_POSITIVE_INTEGER", `${field} must be a positive safe integer`, ref);
  }
}

function unique(
  set: Set<string>,
  value: string,
  code: string,
  issues: VehicleContentIssue[]
): void {
  if (set.has(value)) {
    error(issues, code, `Duplicate value: ${value}`, value);
  }
  set.add(value);
}

function error(
  issues: VehicleContentIssue[],
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({ severity: "error", code, message, ref });
}

function warning(
  issues: VehicleContentIssue[],
  code: string,
  message: string,
  ref: string | null
): void {
  issues.push({ severity: "warning", code, message, ref });
}
