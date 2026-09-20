import type { VehicleId } from "../../contracts/ids/EntityIds.js";

export class VehicleLifecycleRuntimeState {
  private readonly fractionRemainders = new Map<string, number>();

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
