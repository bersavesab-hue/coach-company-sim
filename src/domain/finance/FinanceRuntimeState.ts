import type {
  CompanyId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";

export interface EnergyInventoryBook {
  readonly units: number;
  readonly bookValueCents: number;
}

export interface FinanceRuntimeStateSnapshot {
  readonly lastAccruedDay: readonly (readonly [CompanyId, number])[];
  readonly fractionRemainders: readonly (readonly [string, number])[];
  readonly energyInventory: readonly (readonly [VehicleId, EnergyInventoryBook])[];
  readonly processedRuntimeSources: readonly string[];
}

export class FinanceRuntimeState {
  private readonly lastAccruedDay = new Map<CompanyId, number>();
  private readonly fractionRemainders = new Map<string, number>();
  private readonly energyInventory = new Map<VehicleId, EnergyInventoryBook>();
  private readonly processedRuntimeSources = new Set<string>();

  static fromSnapshot(
    snapshot: FinanceRuntimeStateSnapshot
  ): FinanceRuntimeState {
    const state = new FinanceRuntimeState();
    for (const [companyId, day] of snapshot.lastAccruedDay) {
      state.lastAccruedDay.set(companyId, day);
    }
    for (const [key, value] of snapshot.fractionRemainders) {
      state.fractionRemainders.set(key, value);
    }
    for (const [vehicleId, book] of snapshot.energyInventory) {
      state.energyInventory.set(vehicleId, book);
    }
    for (const sourceRef of snapshot.processedRuntimeSources) {
      state.processedRuntimeSources.add(sourceRef);
    }
    return state;
  }

  snapshot(): FinanceRuntimeStateSnapshot {
    return {
      lastAccruedDay: [...this.lastAccruedDay.entries()],
      fractionRemainders: [...this.fractionRemainders.entries()],
      energyInventory: [...this.energyInventory.entries()],
      processedRuntimeSources: [...this.processedRuntimeSources.values()]
    };
  }

  lastFixedCostAccruedDay(companyId: CompanyId): number {
    return this.lastAccruedDay.get(companyId) ?? 0;
  }

  setLastFixedCostAccruedDay(
    companyId: CompanyId,
    day: number
  ): void {
    if (!Number.isSafeInteger(day) || day < 0) {
      throw new Error("Accrued finance day must be a non-negative integer");
    }
    this.lastAccruedDay.set(companyId, day);
  }

  consumeFraction(
    key: string,
    numerator: number,
    denominator: number
  ): number {
    if (
      key.length === 0 ||
      !Number.isSafeInteger(numerator) ||
      numerator < 0 ||
      !Number.isSafeInteger(denominator) ||
      denominator <= 0
    ) {
      throw new Error("Invalid fractional finance accumulator input");
    }

    const total = (this.fractionRemainders.get(key) ?? 0) + numerator;
    if (!Number.isSafeInteger(total)) {
      throw new Error("Finance fractional accumulator overflow");
    }

    const whole = Math.floor(total / denominator);
    this.fractionRemainders.set(key, total % denominator);
    return whole;
  }

  hasProcessedRuntimeSource(sourceRef: string): boolean {
    return this.processedRuntimeSources.has(sourceRef);
  }

  markProcessedRuntimeSource(sourceRef: string): void {
    this.processedRuntimeSources.add(sourceRef);
  }

  addEnergyInventory(
    vehicleId: VehicleId,
    units: number,
    bookValueCents: number
  ): void {
    validateNonNegativeInteger(units, "energy units");
    validateNonNegativeInteger(bookValueCents, "energy book value");

    const current = this.energyInventory.get(vehicleId) ?? {
      units: 0,
      bookValueCents: 0
    };

    this.energyInventory.set(vehicleId, {
      units: current.units + units,
      bookValueCents: current.bookValueCents + bookValueCents
    });
  }

  consumeEnergyInventory(
    vehicleId: VehicleId,
    requestedUnits: number
  ): EnergyInventoryBook {
    validateNonNegativeInteger(requestedUnits, "requested energy units");

    const current = this.energyInventory.get(vehicleId) ?? {
      units: 0,
      bookValueCents: 0
    };
    const units = Math.min(requestedUnits, current.units);

    if (units === 0) {
      return { units: 0, bookValueCents: 0 };
    }

    const cost =
      units === current.units
        ? current.bookValueCents
        : Math.floor(
            (current.bookValueCents * units) / current.units
          );

    this.energyInventory.set(vehicleId, {
      units: current.units - units,
      bookValueCents: current.bookValueCents - cost
    });

    return { units, bookValueCents: cost };
  }

  removeEnergyInventory(vehicleId: VehicleId): EnergyInventoryBook {
    const current = this.energyInventory.get(vehicleId) ?? {
      units: 0,
      bookValueCents: 0
    };
    this.energyInventory.delete(vehicleId);
    return current;
  }

  energyInventoryFor(vehicleId: VehicleId): EnergyInventoryBook {
    return this.energyInventory.get(vehicleId) ?? {
      units: 0,
      bookValueCents: 0
    };
  }
}

function validateNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
}
