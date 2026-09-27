import type { VehicleId } from "../../contracts/ids/EntityIds.js";

export interface VehicleLifecycleRuntimeStateSnapshot {
  readonly fractionRemainders: readonly (readonly [string, number])[];
}

export class VehicleLifecycleRuntimeState {
  private readonly fractionRemainders = new Map<string, number>();

  static fromSnapshot(
    snapshot: VehicleLifecycleRuntimeStateSnapshot
  ): VehicleLifecycleRuntimeState {
    const state = new VehicleLifecycleRuntimeState();
    for (const [key, value] of snapshot.fractionRemainders) {
      state.fractionRemainders.set(key, value);
    }
    return state;
  }

  snapshot(): VehicleLifecycleRuntimeStateSnapshot {
    return {
      fractionRemainders: [...this.fractionRemainders.entries()]
    };
  }

  consumeFraction(
    vehicleId: VehicleId,
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
      throw new Error("Invalid vehicle lifecycle fractional accumulator");
    }

    const compositeKey = `${vehicleId}:${key}`;
    const total =
      (this.fractionRemainders.get(compositeKey) ?? 0) + numerator;

    if (!Number.isSafeInteger(total)) {
      throw new Error("Vehicle lifecycle accumulator overflow");
    }

    const whole = Math.floor(total / denominator);
    this.fractionRemainders.set(compositeKey, total % denominator);
    return whole;
  }
}
