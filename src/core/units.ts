export type MoneyCents = number;
export type DistanceM = number;
export type GameSeconds = number;
export type WorldMeter = number;
export type SpeedMps = number;
export type Permille = number;

export function requireInteger(value: number, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
}

export function requireNonNegativeInteger(value: number, label: string): number {
  requireInteger(value, label);
  if (value < 0) {
    throw new Error(`${label} must be >= 0`);
  }
  return value;
}

export function requirePositiveInteger(value: number, label: string): number {
  requireInteger(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be > 0`);
  }
  return value;
}
