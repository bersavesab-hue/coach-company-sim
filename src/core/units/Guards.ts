export function requireSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer`);
  }
  return value;
}

export function requireNonNegativeInteger(
  value: number,
  label: string
): number {
  requireSafeInteger(value, label);
  if (value < 0) {
    throw new Error(`${label} must be >= 0`);
  }
  return value;
}

export function requirePositiveInteger(value: number, label: string): number {
  requireSafeInteger(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be > 0`);
  }
  return value;
}

export function requirePermille(value: number, label: string): number {
  requireNonNegativeInteger(value, label);
  if (value > 1000) {
    throw new Error(`${label} must be <= 1000`);
  }
  return value;
}
