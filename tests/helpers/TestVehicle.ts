import type {
  CompanyId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../src/contracts/ids/EntityIds.js";
import {
  ids
} from "../../src/contracts/ids/EntityIds.js";
import {
  units,
  type GameSecond
} from "../../src/core/units/Units.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { VehicleLifecycleRuntimeState } from "../../src/domain/vehicle/VehicleLifecycleRuntimeState.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import type { VehicleLifecyclePolicy } from "../../src/application/policies/VehicleLifecyclePolicy.js";
import type { VehicleMarketPolicy } from "../../src/application/policies/VehicleMarketPolicy.js";
import type { VehicleRuntimeRepository } from "../../src/application/repositories/VehicleRuntimeRepository.js";
import type { VehicleMarketRepository } from "../../src/application/repositories/VehicleMarketRepository.js";
import type { VehicleBrand } from "../../src/domain/vehicle-market/VehicleBrand.js";
import type { VehicleSeries } from "../../src/domain/vehicle-market/VehicleSeries.js";
import type { VehicleModelIdentity } from "../../src/domain/vehicle-market/VehicleModelIdentity.js";
import type { VehicleVariant } from "../../src/domain/vehicle-market/VehicleVariant.js";
import type { VehicleOptionDefinition } from "../../src/domain/vehicle-market/VehicleOptionDefinition.js";
import type { VehicleConfiguration } from "../../src/domain/vehicle-market/VehicleConfiguration.js";
import type { VehicleDealer } from "../../src/domain/vehicle-market/VehicleDealer.js";
import type { VehicleListing } from "../../src/domain/vehicle-market/VehicleListing.js";
import type { VehicleInspectionReport } from "../../src/domain/vehicle-market/VehicleInspectionReport.js";
import type { VehicleAuction } from "../../src/domain/vehicle-market/VehicleAuction.js";

export function createTestVehicleModel(
  overrides: Partial<VehicleModel> = {}
): VehicleModel {
  return {
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    seatCapacity: 20,
    maxSpeedMps: units.speedMps(25),
    energyKind: "diesel_ml",
    energyCapacityUnits: 100_000,
    minimumDispatchEnergyUnits: 5_000,
    drivingEnergyUnitsPer100Km: 20_000,
    idleEnergyUnitsPerHour: 2_000,
    serviceIntervalM: 20_000_000,
    powertrainWearPermillePer1000Km: 2,
    brakeWearPermillePer1000Km: 3,
    tireWearPermillePer1000Km: 4,
    minimumPowertrainConditionPermille: 500,
    minimumBrakeConditionPermille: 600,
    minimumTireConditionPermille: 600,
    active: true,
    ...overrides
  };
}

export function createTestOwnedVehicle(input: {
  readonly id?: VehicleId;
  readonly companyId?: CompanyId;
  readonly modelId?: VehicleModelId;
  readonly depotStationId?: StationId | null;
  readonly activeTripId?: TripId | null;
  readonly status?: OwnedVehicle["status"];
  readonly mileageM?: number;
  readonly energyUnits?: number;
  readonly seatCapacity?: number;
  readonly energyCapacityUnits?: number;
  readonly gameSecond?: GameSecond;
  readonly nextMaintenanceMileageM?: number;
  readonly previousOwnerCount?: number;
  readonly recordedAccidentCount?: number;
} = {}): OwnedVehicle {
  const now = input.gameSecond ?? units.gameSecond(0);
  const mileage = input.mileageM ?? 0;

  return {
    id: input.id ?? ids.vehicle("vehicle.00000001"),
    companyId: input.companyId ?? ids.company("company.00000001"),
    modelId: input.modelId ?? ids.vehicleModel("vehicle_model.000001"),
    configurationId: null,
    seatCapacity: input.seatCapacity ?? 20,
    energyCapacityUnits: input.energyCapacityUnits ?? 100_000,
    previousOwnerCount: input.previousOwnerCount ?? 0,
    recordedAccidentCount: input.recordedAccidentCount ?? 0,
    mileageM: units.distanceM(mileage),
    energyUnits: input.energyUnits ?? 100_000,
    powertrainConditionPermille: units.permille(1000),
    brakeConditionPermille: units.permille(1000),
    tireConditionPermille: units.permille(1000),
    bodyConditionPermille: units.permille(1000),
    lastMaintenanceMileageM: units.distanceM(0),
    nextMaintenanceMileageM: units.distanceM(
      input.nextMaintenanceMileageM ?? 20_000_000
    ),
    registeredAtGameSecond: now,
    insuranceValidUntilGameSecond: units.gameSecond(
      Number(now) + 365 * 86_400
    ),
    inspectionValidUntilGameSecond: units.gameSecond(
      Number(now) + 365 * 86_400
    ),
    status: input.status ?? "available",
    activeIncident: null,
    depotStationId: input.depotStationId ?? null,
    currentStationId: input.depotStationId ?? null,
    availableAtGameSecond: now,
    activeTripId: input.activeTripId ?? null,
    activeFleetTaskId: null
  };
}

export function createTestVehicleRuntimeRepository(): VehicleRuntimeRepository {
  let state = new VehicleLifecycleRuntimeState();
  return {
    get: () => state,
    replace: (value) => {
      state = value;
    }
  };
}

export const zeroVehicleLifecyclePolicy: VehicleLifecyclePolicy = {
  quoteInitialOwnershipTerms: () => ({
    residualValueCents: units.moneyCents(0),
    usefulLifeDays: 3650,
    initialInsuranceValidDays: 365,
    initialInspectionValidDays: 365,
    dailyInsuranceCents: units.moneyCents(0),
    dailyVehicleTaxCents: units.moneyCents(0)
  }),
  quoteMaintenance: () => units.moneyCents(0),
  quoteInsuranceRenewal: () => ({
    costCents: units.moneyCents(0),
    validForDays: 365
  }),
  quoteInspection: () => ({
    costCents: units.moneyCents(0),
    validForDays: 365
  }),
  quoteScrap: () => units.moneyCents(0)
};


export function createTestVehicleMarketRepository(input: {
  readonly brands?: readonly VehicleBrand[];
  readonly series?: readonly VehicleSeries[];
  readonly modelIdentities?: readonly VehicleModelIdentity[];
  readonly variants?: readonly VehicleVariant[];
  readonly options?: readonly VehicleOptionDefinition[];
  readonly configurations?: readonly VehicleConfiguration[];
  readonly dealers?: readonly VehicleDealer[];
  readonly listings?: readonly VehicleListing[];
  readonly inspectionReports?: readonly VehicleInspectionReport[];
  readonly auctions?: readonly VehicleAuction[];
} = {}): VehicleMarketRepository {
  const brands = new Map(
    (input.brands ?? []).map((value) => [value.id, value])
  );
  const series = new Map(
    (input.series ?? []).map((value) => [value.id, value])
  );
  const modelIdentities = new Map(
    (input.modelIdentities ?? []).map((value) => [
      value.modelId,
      value
    ])
  );
  const variants = new Map(
    (input.variants ?? []).map((value) => [value.id, value])
  );
  const options = new Map(
    (input.options ?? []).map((value) => [value.code, value])
  );
  const configurations = new Map(
    (input.configurations ?? []).map((value) => [
      value.id,
      value
    ])
  );
  const dealers = new Map(
    (input.dealers ?? []).map((value) => [value.id, value])
  );
  const listings = new Map(
    (input.listings ?? []).map((value) => [value.id, value])
  );
  const inspectionReports = new Map(
    (input.inspectionReports ?? []).map((value) => [value.id, value])
  );
  const auctions = new Map(
    (input.auctions ?? []).map((value) => [value.id, value])
  );

  return {
    getBrand: (id) => brands.get(id),
    getSeries: (id) => series.get(id),
    getModelIdentity: (id) => modelIdentities.get(id),
    getVariant: (id) => variants.get(id),
    getOption: (code) => options.get(code),
    getConfiguration: (id) => configurations.get(id),
    saveConfiguration: (value) =>
      configurations.set(value.id, value),
    getDealer: (id) => dealers.get(id),
    getListing: (id) => listings.get(id),
    findListings: () => [...listings.values()],
    findAvailableListings: () =>
      [...listings.values()].filter(
        (value) => value.status === "available"
      ),
    saveListing: (value) => listings.set(value.id, value),
    getInspectionReport: (id) => inspectionReports.get(id),
    findInspectionReportsByListing: (listingId) =>
      [...inspectionReports.values()].filter(
        (value) => value.listingId === listingId
      ),
    saveInspectionReport: (value) =>
      inspectionReports.set(value.id, value),
    getAuction: (id) => auctions.get(id),
    findAuctions: () => [...auctions.values()],
    saveAuction: (value) => auctions.set(value.id, value)
  };
}


export const zeroVehicleMarketPolicy: VehicleMarketPolicy = {
  ageValuePermille: () => units.permille(1000),
  mileageValuePermille: () => units.permille(1000),
  conditionValuePermille: () => units.permille(1000),
  accidentValuePermille: () => units.permille(1000),
  regionalDemandPermille: () => units.permille(1000),
  dealerBuyPermille: () => units.permille(700),
  suggestedAskPermille: () => units.permille(1000),
  negotiationFloorPermille: () => units.permille(900),
  listingFeeCents: () => units.moneyCents(0),
  inspectionCostCents: () => units.moneyCents(0),
  negotiationReservationSeconds: () => 3600,
  auctionMinimumIncrementCents: () => units.moneyCents(1000),
  auctionSellerFeePermille: () => units.permille(0)
};
