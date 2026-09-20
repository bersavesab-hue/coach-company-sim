import type {
  CompanyId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents
} from "../../core/units/Units.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";

export interface VehicleOwnershipTerms {
  readonly residualValueCents: MoneyCents;
  readonly usefulLifeDays: number;
  readonly initialInsuranceValidDays: number;
  readonly initialInspectionValidDays: number;
  readonly dailyInsuranceCents: MoneyCents;
  readonly dailyVehicleTaxCents: MoneyCents;
}

export interface CoverageRenewalQuote {
  readonly costCents: MoneyCents;
  readonly validForDays: number;
}

export interface VehicleLifecyclePolicy {
  quoteInitialOwnershipTerms(
    companyId: CompanyId,
    vehicleModelId: VehicleModelId,
    gameSecond: GameSecond
  ): VehicleOwnershipTerms;

  quoteMaintenance(
    vehicle: OwnedVehicle,
    model: VehicleModel,
    gameSecond: GameSecond
  ): MoneyCents;

  quoteInsuranceRenewal(
    vehicle: OwnedVehicle,
    gameSecond: GameSecond
  ): CoverageRenewalQuote;

  quoteInspection(
    vehicle: OwnedVehicle,
    gameSecond: GameSecond
  ): CoverageRenewalQuote;

  quoteResale(
    vehicle: OwnedVehicle,
    model: VehicleModel,
    gameSecond: GameSecond
  ): MoneyCents;

  quoteScrap(
    vehicle: OwnedVehicle,
    model: VehicleModel,
    gameSecond: GameSecond
  ): MoneyCents;
}
