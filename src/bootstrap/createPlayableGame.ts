import { createApplication } from "./createApplication.js";
import { ids } from "../contracts/ids/EntityIds.js";
import {
  units,
  type GameSecond
} from "../core/units/Units.js";
import type { Station } from "../domain/station/Station.js";
import type { Company } from "../domain/company/Company.js";
import type { Driver } from "../domain/staff/Driver.js";
import type { FarePolicy } from "../domain/finance/FarePolicy.js";
import type {
  CompanyFinancialProfile,
  DriverCompensationProfile,
  StationFinancialProfile,
  VehicleEconomicProfile
} from "../domain/finance/FinancialProfiles.js";
import type { EconomicPolicy } from "../simulation/finance/EconomicPolicy.js";
import type { PassengerDemandPolicy } from "../simulation/passenger/PassengerDemandPolicy.js";
import type { VehicleLifecyclePolicy } from "../application/policies/VehicleLifecyclePolicy.js";
import type { VehicleMarketPolicy } from "../application/policies/VehicleMarketPolicy.js";
import type { OperationsPolicy } from "../application/policies/OperationsPolicy.js";
import { FORMAL_VEHICLE_CONTENT } from "../content/vehicle/VehicleContentSeed.js";
import { createPlayableWorldSeed } from "../content/map/WorldMapSeed.js";
import { InMemoryRepositoryBundle } from "../infrastructure/memory/InMemoryRepositoryBundle.js";
import { SequentialRuntimeIdAllocator } from "../infrastructure/runtime/SequentialRuntimeIdAllocator.js";

export const PLAYABLE_COMPANY_ID = ids.company(
  "company.player"
);
export const PLAYABLE_FARE_POLICY_ID =
  ids.farePolicy("fare_policy.standard");
export const PLAYABLE_START_GAME_SECOND =
  units.gameSecond(5 * 3600 + 30 * 60);

export function createPlayableGame() {
  const worldSeed = createPlayableWorldSeed();
  const company: Company = {
    id: PLAYABLE_COMPANY_ID,
    name: "星河客运",
    status: "active",
    reputationPermille: units.permille(180),
    licenseIds: [
      ids.license("license.county"),
      ids.license("license.intercity"),
      ids.license("license.tourism")
    ],
    homeStationId: worldSeed.stations[0]!.id
  };

  const drivers = createDrivers(
    PLAYABLE_COMPANY_ID,
    worldSeed.stations[0]!.id
  );
  const farePolicy: FarePolicy = {
    id: PLAYABLE_FARE_POLICY_ID,
    baseFareCents: units.moneyCents(800),
    perKmCents: units.moneyCents(45),
    minimumFareCents: units.moneyCents(800),
    maximumFareCents: units.moneyCents(18_000),
    roundingIncrementCents: 100,
    roundingMode: "nearest",
    pairOverrides: []
  };

  const companyFinance: CompanyFinancialProfile = {
    companyId: PLAYABLE_COMPANY_ID,
    openingCapitalCents: units.moneyCents(
      8_000_000 * 100
    ),
    dailyOverheadCents: units.moneyCents(120_000)
  };

  const vehicleEconomics: VehicleEconomicProfile[] =
    FORMAL_VEHICLE_CONTENT.models.map((model) => ({
      vehicleModelId: model.id,
      maintenanceEconomicCostCentsPerKm:
        units.moneyCents(90),
      economicDepreciationCentsPerKm:
        units.moneyCents(120)
    }));

  const driverProfiles: DriverCompensationProfile[] =
    drivers.map((driver) => ({
      staffId: driver.id,
      companyId: PLAYABLE_COMPANY_ID,
      baseDailyWageCents: units.moneyCents(38_000),
      drivingAllowanceCentsPerHour:
        units.moneyCents(2_000),
      employerBurdenPermille: units.permille(160)
    }));

  const stationProfiles: StationFinancialProfile[] = [
    {
      stationId: worldSeed.stations[0]!.id,
      companyId: PLAYABLE_COMPANY_ID,
      dailyLeaseCents: units.moneyCents(25_000)
    }
  ];

  const repositories = new InMemoryRepositoryBundle({
    world: worldSeed.world,
    stations: worldSeed.stations,
    companies: [company],
    passengerDemand: worldSeed.passengerDemand,
    drivers,
    vehicleModels: FORMAL_VEHICLE_CONTENT.models,
    brands: FORMAL_VEHICLE_CONTENT.brands,
    series: FORMAL_VEHICLE_CONTENT.series,
    modelIdentities:
      FORMAL_VEHICLE_CONTENT.modelIdentities,
    variants: FORMAL_VEHICLE_CONTENT.variants,
    options: FORMAL_VEHICLE_CONTENT.options,
    dealers: FORMAL_VEHICLE_CONTENT.dealers,
    farePolicies: [farePolicy],
    companyFinancialProfiles: [companyFinance],
    vehicleEconomicProfiles: vehicleEconomics,
    driverCompensationProfiles: driverProfiles,
    stationFinancialProfiles: stationProfiles
  });

  const app = createApplication({
    repositories,
    ids: new SequentialRuntimeIdAllocator(),
    passengerDemandPolicy,
    economicPolicy,
    vehicleLifecyclePolicy,
    vehicleMarketPolicy,
    operationsPolicy
  });

  app.simulation.advanceTo(
    PLAYABLE_START_GAME_SECOND
  );

  return {
    app,
    repositories,
    company,
    stations: worldSeed.stations,
    startGameSecond: PLAYABLE_START_GAME_SECOND
  };
}

function createDrivers(
  companyId: Company["id"],
  stationId: Station["id"]
): Driver[] {
  const classes = [
    "rural_minibus",
    "county_midibus",
    "standard_coach",
    "intercity_coach",
    "premium_coach",
    "tourist_coach",
    "airport_shuttle",
    "high_capacity_coach"
  ];
  return ["陈师傅", "王师傅", "周师傅", "赵师傅", "刘师傅", "孙师傅"].map(
    (name, index) => ({
      id: ids.staff(
        `staff.${String(index + 1).padStart(8, "0")}`
      ),
      companyId,
      name,
      status: "available" as const,
      qualifiedVehicleClasses: classes,
      currentStationId: stationId,
      availableAtGameSecond: PLAYABLE_START_GAME_SECOND,
      dutyStartedAtGameSecond: null,
      lastDutyEndedAtGameSecond: null,
      continuousDrivingSeconds: 0,
      activeTripId: null,
      activeFleetTaskId: null
    })
  );
}

const passengerDemandPolicy: PassengerDemandPolicy = {
  frequencyMultiplierPermille: (departuresPerDay) =>
    units.permille(
      Math.min(1300, 700 + departuresPerDay * 45)
    )
};

const economicPolicy: EconomicPolicy = {
  energyPriceMilliCentsPerUnit: (kind) => {
    switch (kind) {
      case "electric_wh":
        return 8;
      case "hydrogen_gram":
        return 3500;
      case "gasoline_ml":
        return 860;
      case "diesel_ml":
        return 780;
    }
  },
  roadTollMilliCentsPerKm: (roadClass) =>
    roadClass === "expressway"
      ? 55_000
      : roadClass === "national_road"
        ? 12_000
        : 0,
  ticketTaxCents: (gross) =>
    units.moneyCents(
      Math.floor(Number(gross) * 0.03)
    ),
  stationDepartureFeeCents: () =>
    units.moneyCents(1_200),
  stationArrivalFeeCents: () =>
    units.moneyCents(800),
  stationPassengerServiceFeeCents: (_station, count) =>
    units.moneyCents(count * 20),
  companyDailyRegulatoryFeeCents: () =>
    units.moneyCents(5_000)
};

const vehicleLifecyclePolicy: VehicleLifecyclePolicy = {
  quoteInitialOwnershipTerms: () => ({
    residualValueCents: units.moneyCents(80_000 * 100),
    usefulLifeDays: 3650,
    initialInsuranceValidDays: 365,
    initialInspectionValidDays: 365,
    dailyInsuranceCents: units.moneyCents(2_200),
    dailyVehicleTaxCents: units.moneyCents(1_000)
  }),
  quoteMaintenance: (vehicle) =>
    units.moneyCents(
      25_000 +
        Math.floor(Number(vehicle.mileageM) / 100_000)
    ),
  quoteInsuranceRenewal: () => ({
    costCents: units.moneyCents(48_000),
    validForDays: 365
  }),
  quoteInspection: () => ({
    costCents: units.moneyCents(12_000),
    validForDays: 365
  }),
  quoteScrap: () => units.moneyCents(35_000 * 100)
};

const vehicleMarketPolicy: VehicleMarketPolicy = {
  ageValuePermille: (days) =>
    units.permille(
      Math.max(280, 1000 - Math.floor(days / 3))
    ),
  mileageValuePermille: (mileageM) =>
    units.permille(
      Math.max(
        450,
        1000 - Math.floor(Number(mileageM) / 400_000)
      )
    ),
  conditionValuePermille: (powertrain, brake, tire, body) =>
    units.permille(
      Math.floor(
        (
          Number(powertrain) +
          Number(brake) +
          Number(tire) +
          Number(body)
        ) / 4
      )
    ),
  accidentValuePermille: (count) =>
    units.permille(Math.max(550, 1000 - count * 100)),
  regionalDemandPermille: () => units.permille(1000),
  dealerBuyPermille: (kind) =>
    units.permille(
      kind === "used_vehicle_dealer" ? 760 : 720
    ),
  suggestedAskPermille: (kind) =>
    units.permille(
      kind === "manufacturer_dealer" ? 1000 : 1040
    ),
  negotiationFloorPermille: () => units.permille(920),
  listingFeeCents: (kind) =>
    units.moneyCents(
      kind === "auction_house" ? 8_000 : 3_000
    ),
  inspectionCostCents: (level) =>
    units.moneyCents(
      level === "full" ? 12_000 : 5_000
    ),
  negotiationReservationSeconds: () => 2 * 3600,
  auctionMinimumIncrementCents: () =>
    units.moneyCents(5_000),
  auctionSellerFeePermille: () => units.permille(30)
};

const operationsPolicy: OperationsPolicy = {
  vehicleTurnaroundSeconds: () => 15 * 60,
  driverTurnaroundSeconds: () => 15 * 60,
  passengerBoardingLeadSeconds: () => 15 * 60,
  minimumDriverRestSeconds: () => 8 * 3600,
  maximumContinuousDrivingSeconds: () => 4 * 3600,
  maximumDutySeconds: () => 12 * 3600,
  refuelServiceSeconds: (kind, unitsValue) =>
    kind === "electric_wh"
      ? Math.max(1800, Math.ceil(unitsValue / 120))
      : Math.max(600, Math.ceil(unitsValue / 180)),
  maintenanceServiceSeconds: () => 2 * 3600,
  recoveryServiceSeconds: () => 3 * 3600
};
