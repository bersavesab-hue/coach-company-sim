import type {
  CompanyId,
  StaffId,
  StationId,
  VehicleId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents,
  Permille
} from "../../core/units/Units.js";

export interface CompanyFinancialProfile {
  readonly companyId: CompanyId;
  readonly openingCapitalCents: MoneyCents;
  readonly dailyOverheadCents: MoneyCents;
}

export interface VehicleEconomicProfile {
  readonly vehicleModelId: VehicleModelId;
  readonly maintenanceEconomicCostCentsPerKm: MoneyCents;
  readonly economicDepreciationCentsPerKm: MoneyCents;
}

export interface VehicleAssetProfile {
  readonly vehicleId: VehicleId;
  readonly companyId: CompanyId;
  readonly acquisitionCostCents: MoneyCents;
  readonly residualValueCents: MoneyCents;
  readonly usefulLifeDays: number;
  readonly acquiredGameSecond: GameSecond;
  readonly dailyInsuranceCents: MoneyCents;
  readonly dailyVehicleTaxCents: MoneyCents;
}

export interface DriverCompensationProfile {
  readonly staffId: StaffId;
  readonly companyId: CompanyId;
  readonly baseDailyWageCents: MoneyCents;
  readonly drivingAllowanceCentsPerHour: MoneyCents;
  readonly employerBurdenPermille: Permille;
}

export interface StationFinancialProfile {
  readonly stationId: StationId;
  readonly companyId: CompanyId;
  readonly dailyLeaseCents: MoneyCents;
}
