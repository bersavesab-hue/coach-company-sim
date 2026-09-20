import type {
  CompanyId,
  FarePolicyId,
  StaffId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type { FarePolicy } from "../../domain/finance/FarePolicy.js";
import type { FinanceRuntimeState } from "../../domain/finance/FinanceRuntimeState.js";
import type {
  CompanyFinancialProfile,
  DriverCompensationProfile,
  StationFinancialProfile,
  VehicleAssetProfile,
  VehicleEconomicProfile
} from "../../domain/finance/FinancialProfiles.js";
import type { LedgerEntry } from "../../domain/finance/LedgerEntry.js";
import type { ManagementCostEntry } from "../../domain/finance/ManagementCostEntry.js";

export interface FinanceRepository {
  getFarePolicy(id: FarePolicyId): FarePolicy | undefined;

  getVehicleEconomicProfile(
    vehicleModelId: VehicleModelId
  ): VehicleEconomicProfile | undefined;

  getVehicleAssetProfile(
    vehicleId: VehicleId
  ): VehicleAssetProfile | undefined;

  getDriverCompensationProfile(
    staffId: StaffId
  ): DriverCompensationProfile | undefined;

  companyFinancialProfiles(): readonly CompanyFinancialProfile[];
  vehicleAssetProfilesByCompany(
    companyId: CompanyId
  ): readonly VehicleAssetProfile[];
  driverCompensationProfilesByCompany(
    companyId: CompanyId
  ): readonly DriverCompensationProfile[];
  stationFinancialProfilesByCompany(
    companyId: CompanyId
  ): readonly StationFinancialProfile[];

  hasLedgerSourceRef(sourceRef: string): boolean;
  appendLedgerEntry(entry: LedgerEntry): void;
  ledgerEntriesByCompany(companyId: CompanyId): readonly LedgerEntry[];
  ledgerEntriesByTrip(tripId: TripId): readonly LedgerEntry[];

  hasManagementCostSourceRef(sourceRef: string): boolean;
  appendManagementCost(entry: ManagementCostEntry): void;
  managementCostsByTrip(tripId: TripId): readonly ManagementCostEntry[];

  getRuntimeState(): FinanceRuntimeState;
  replaceRuntimeState(state: FinanceRuntimeState): void;
}
