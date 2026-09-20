import type {
  VehicleMarketZoneCode,
  VehicleMarketZoneDemandProfile
} from "./VehicleContentTypes.js";

export const VEHICLE_MARKET_ZONE_DEMAND_PROFILES:
  readonly VehicleMarketZoneDemandProfile[] = [
    {
      zoneCode: "north",
      minibusDemandPermille: 950,
      midibusDemandPermille: 1100,
      coachDemandPermille: 1160,
      premiumDemandPermille: 900,
      tourismDemandPermille: 880,
      newEnergyDemandPermille: 850,
      priceSensitivityPermille: 1100
    },
    {
      zoneCode: "east",
      minibusDemandPermille: 850,
      midibusDemandPermille: 950,
      coachDemandPermille: 1080,
      premiumDemandPermille: 1220,
      tourismDemandPermille: 1140,
      newEnergyDemandPermille: 1260,
      priceSensitivityPermille: 850
    },
    {
      zoneCode: "south",
      minibusDemandPermille: 900,
      midibusDemandPermille: 1000,
      coachDemandPermille: 1040,
      premiumDemandPermille: 1100,
      tourismDemandPermille: 1260,
      newEnergyDemandPermille: 1200,
      priceSensitivityPermille: 900
    },
    {
      zoneCode: "central",
      minibusDemandPermille: 1100,
      midibusDemandPermille: 1210,
      coachDemandPermille: 1120,
      premiumDemandPermille: 900,
      tourismDemandPermille: 960,
      newEnergyDemandPermille: 1000,
      priceSensitivityPermille: 1160
    },
    {
      zoneCode: "west",
      minibusDemandPermille: 1220,
      midibusDemandPermille: 1260,
      coachDemandPermille: 1050,
      premiumDemandPermille: 800,
      tourismDemandPermille: 1020,
      newEnergyDemandPermille: 860,
      priceSensitivityPermille: 1260
    },
    {
      zoneCode: "northeast",
      minibusDemandPermille: 1040,
      midibusDemandPermille: 1140,
      coachDemandPermille: 1220,
      premiumDemandPermille: 900,
      tourismDemandPermille: 850,
      newEnergyDemandPermille: 760,
      priceSensitivityPermille: 1140
    }
  ];

if (VEHICLE_MARKET_ZONE_DEMAND_PROFILES.length !== 6) {
  throw new Error(
    `Vehicle market demand catalog must contain exactly 6 zones, found ${VEHICLE_MARKET_ZONE_DEMAND_PROFILES.length}`
  );
}

const BY_ZONE = new Map<
  VehicleMarketZoneCode,
  VehicleMarketZoneDemandProfile
>(
  VEHICLE_MARKET_ZONE_DEMAND_PROFILES.map((profile) => [
    profile.zoneCode,
    profile
  ])
);

export function vehicleMarketZoneDemandProfile(
  zoneCode: VehicleMarketZoneCode
): VehicleMarketZoneDemandProfile {
  const profile = BY_ZONE.get(zoneCode);
  if (!profile) {
    throw new Error(
      `Unknown vehicle market zone: ${zoneCode}`
    );
  }
  return profile;
}
