import type {
  CompanyId,
  FarePolicyId,
  StaffId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { FarePolicy } from "../../src/domain/finance/FarePolicy.js";
import { FinanceRuntimeState } from "../../src/domain/finance/FinanceRuntimeState.js";
import type {
  CompanyFinancialProfile,
  DriverCompensationProfile,
  StationFinancialProfile,
  VehicleAssetProfile,
  VehicleEconomicProfile
} from "../../src/domain/finance/FinancialProfiles.js";
import type { LedgerEntry } from "../../src/domain/finance/LedgerEntry.js";
import type { ManagementCostEntry } from "../../src/domain/finance/ManagementCostEntry.js";
import type { FinanceRepository } from "../../src/application/repositories/FinanceRepository.js";
import type { EconomicPolicy } from "../../src/simulation/finance/EconomicPolicy.js";

export interface TestFinanceSeed {
  readonly farePolicies?: readonly FarePolicy[];
  readonly companyProfiles?: readonly CompanyFinancialProfile[];
  readonly vehicleEconomicProfiles?: readonly VehicleEconomicProfile[];
  readonly vehicleAssetProfiles?: readonly VehicleAssetProfile[];
  readonly driverProfiles?: readonly DriverCompensationProfile[];
  readonly stationProfiles?: readonly StationFinancialProfile[];
}

export function createTestFinanceRepository(
  seed: TestFinanceSeed = {}
): FinanceRepository {
  const farePolicies = new Map<FarePolicyId, FarePolicy>(
    (seed.farePolicies ?? []).map((value) => [value.id, value])
  );
  const vehicleEconomics = new Map<VehicleModelId, VehicleEconomicProfile>(
    (seed.vehicleEconomicProfiles ?? []).map(
      (value) => [value.vehicleModelId, value]
    )
  );
  const vehicleAssets = new Map<VehicleId, VehicleAssetProfile>(
    (seed.vehicleAssetProfiles ?? []).map(
      (value) => [value.vehicleId, value]
    )
  );
  const driverProfiles = new Map<StaffId, DriverCompensationProfile>(
    (seed.driverProfiles ?? []).map(
      (value) => [value.staffId, value]
    )
  );
  const companyProfiles = [...(seed.companyProfiles ?? [])];
  const stationProfiles = [...(seed.stationProfiles ?? [])];
  const ledger: LedgerEntry[] = [];
  const management: ManagementCostEntry[] = [];
  let runtime = new FinanceRuntimeState();

  return {
    getFarePolicy: (id) => farePolicies.get(id),
    getVehicleEconomicProfile: (id) => vehicleEconomics.get(id),
    getVehicleAssetProfile: (id) => vehicleAssets.get(id),
    saveVehicleAssetProfile: (profile) =>
      vehicleAssets.set(profile.vehicleId, profile),
    removeVehicleAssetProfile: (id) => {
      vehicleAssets.delete(id);
    },
    getDriverCompensationProfile: (id) => driverProfiles.get(id),
    companyFinancialProfiles: () => companyProfiles,
    vehicleAssetProfilesByCompany: (companyId: CompanyId) =>
      [...vehicleAssets.values()].filter(
        (value) => value.companyId === companyId
      ),
    driverCompensationProfilesByCompany: (companyId: CompanyId) =>
      [...driverProfiles.values()].filter(
        (value) => value.companyId === companyId
      ),
    stationFinancialProfilesByCompany: (companyId: CompanyId) =>
      stationProfiles.filter((value) => value.companyId === companyId),
    hasLedgerSourceRef: (sourceRef) =>
      ledger.some((entry) => entry.sourceRef === sourceRef),
    appendLedgerEntry: (entry) => ledger.push(entry),
    ledgerEntriesByCompany: (companyId) =>
      ledger.filter((entry) => entry.companyId === companyId),
    ledgerEntriesByTrip: (tripId: TripId) =>
      ledger.filter((entry) => entry.tripId === tripId),
    ledgerEntriesByVehicle: (vehicleId: VehicleId) =>
      ledger.filter((entry) => entry.vehicleId === vehicleId),
    hasManagementCostSourceRef: (sourceRef) =>
      management.some((entry) => entry.sourceRef === sourceRef),
    appendManagementCost: (entry) => management.push(entry),
    managementCostsByTrip: (tripId) =>
      management.filter((entry) => entry.tripId === tripId),
    getRuntimeState: () => runtime,
    replaceRuntimeState: (value) => {
      runtime = value;
    }
  };
}

export const zeroEconomicPolicy: EconomicPolicy = {
  energyPriceMilliCentsPerUnit: () => 0,
  roadTollMilliCentsPerKm: () => 0,
  ticketTaxCents: () => units.moneyCents(0),
  stationDepartureFeeCents: () => units.moneyCents(0),
  stationArrivalFeeCents: () => units.moneyCents(0),
  stationPassengerServiceFeeCents: () => units.moneyCents(0),
  companyDailyRegulatoryFeeCents: () => units.moneyCents(0)
};
