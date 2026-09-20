import type { CompanyId } from "../../contracts/ids/EntityIds.js";

export class FinanceRuntimeState {
  private readonly lastAccruedDay = new Map<CompanyId, number>();
  private readonly fractionRemainders = new Map<string, number>();

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
}
