import type { EnergyKind } from "../../domain/vehicle/EnergyKind.js";
import {
  vehicleMarketZoneDemandProfile
} from "../../content/vehicle/VehicleMarketDemandCatalog.js";
import type {
  VehicleMarketZoneCode,
  VehicleProductRole
} from "../../content/vehicle/VehicleContentTypes.js";

export interface VehicleMarketDemandQuote {
  readonly roleDemandPermille: number;
  readonly energyDemandPermille: number;
  readonly affordabilityPermille: number;
  readonly combinedDemandPermille: number;
}

export function quoteVehicleMarketDemand(input: {
  readonly zoneCode: VehicleMarketZoneCode | null;
  readonly role: VehicleProductRole;
  readonly energyKind: EnergyKind;
  readonly basePriceCents: number;
}): VehicleMarketDemandQuote {
  if (input.zoneCode === null) {
    return {
      roleDemandPermille: 1000,
      energyDemandPermille: 1000,
      affordabilityPermille: 1000,
      combinedDemandPermille: 1000
    };
  }

  const profile =
    vehicleMarketZoneDemandProfile(input.zoneCode);
  const roleDemandPermille = roleDemand(
    input.role,
    profile
  );
  const energyDemandPermille =
    input.energyKind === "electric_wh"
      ? profile.newEnergyDemandPermille
      : 1000;
  const affordabilityPermille = affordability(
    input.basePriceCents,
    profile.priceSensitivityPermille
  );
  const combinedDemandPermille = clamp(
    Math.round(
      (
        roleDemandPermille *
        energyDemandPermille *
        affordabilityPermille
      ) /
        1_000_000
    ),
    600,
    1500
  );

  return {
    roleDemandPermille,
    energyDemandPermille,
    affordabilityPermille,
    combinedDemandPermille
  };
}

export function vehicleMarketDemandPricePermille(
  combinedDemandPermille: number
): number {
  return clamp(
    1000 +
      Math.round(
        (combinedDemandPermille - 1000) / 4
      ),
    900,
    1125
  );
}

function roleDemand(
  role: VehicleProductRole,
  profile: ReturnType<
    typeof vehicleMarketZoneDemandProfile
  >
): number {
  switch (role) {
    case "rural_minibus":
      return profile.minibusDemandPermille;
    case "county_midibus":
      return profile.midibusDemandPermille;
    case "premium_coach":
    case "airport_shuttle":
      return profile.premiumDemandPermille;
    case "tourist_coach":
      return profile.tourismDemandPermille;
    case "standard_coach":
    case "intercity_coach":
    case "high_capacity_coach":
      return profile.coachDemandPermille;
  }
}

function affordability(
  basePriceCents: number,
  priceSensitivityPermille: number
): number {
  const referencePriceCents = 600_000 * 100;
  const priceIndexPermille = clamp(
    Math.round(
      (basePriceCents * 1000) /
        referencePriceCents
    ),
    400,
    3000
  );
  const sensitivityDelta =
    priceSensitivityPermille - 1000;
  return clamp(
    1000 -
      Math.round(
        (
          (priceIndexPermille - 1000) *
          sensitivityDelta
        ) /
          2000
      ),
    750,
    1250
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(minimum, Math.min(maximum, value));
}
