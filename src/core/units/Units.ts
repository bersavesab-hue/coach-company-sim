import {
  requireNonNegativeInteger,
  requirePermille,
  requirePositiveInteger
} from "./Guards.js";

declare const unitBrand: unique symbol;

type Unit<TName extends string> = number & {
  readonly [unitBrand]: TName;
};

export type MoneyCents = Unit<"MoneyCents">;
export type DistanceM = Unit<"DistanceM">;
export type GameSecond = Unit<"GameSecond">;
export type SpeedMps = Unit<"SpeedMps">;
export type Permille = Unit<"Permille">;

export const units = {
  moneyCents(value: number): MoneyCents {
    requireNonNegativeInteger(value, "MoneyCents");
    return value as MoneyCents;
  },

  distanceM(value: number): DistanceM {
    requireNonNegativeInteger(value, "DistanceM");
    return value as DistanceM;
  },

  gameSecond(value: number): GameSecond {
    requireNonNegativeInteger(value, "GameSecond");
    return value as GameSecond;
  },

  speedMps(value: number): SpeedMps {
    requirePositiveInteger(value, "SpeedMps");
    return value as SpeedMps;
  },

  permille(value: number): Permille {
    requirePermille(value, "Permille");
    return value as Permille;
  }
} as const;
