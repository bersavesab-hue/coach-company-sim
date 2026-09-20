export interface FixedTimesDeparturePattern {
  readonly kind: "fixed_times";
  readonly secondOfDay: readonly number[];
}

export interface IntervalWindow {
  readonly startSecondOfDay: number;
  readonly endSecondOfDay: number;
  readonly intervalSeconds: number;
}

export interface IntervalWindowDeparturePattern {
  readonly kind: "interval_window";
  readonly windows: readonly IntervalWindow[];
}

export type DeparturePattern =
  | FixedTimesDeparturePattern
  | IntervalWindowDeparturePattern;
