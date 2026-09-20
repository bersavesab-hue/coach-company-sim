import type {
  CompanyId,
  VehicleInspectionReportId,
  VehicleListingId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents,
  Permille
} from "../../core/units/Units.js";

export type VehicleInspectionLevel = "basic" | "full";

export interface VehicleInspectionReport {
  readonly id: VehicleInspectionReportId;
  readonly listingId: VehicleListingId;
  readonly requestedByCompanyId: CompanyId;
  readonly level: VehicleInspectionLevel;
  readonly inspectedAtGameSecond: GameSecond;
  readonly costCents: MoneyCents;
  readonly mileageVerified: boolean;
  readonly verifiedMileageM: number | null;
  readonly mechanicalConditionPermille: Permille;
  readonly bodyConditionPermille: Permille;
  readonly accidentEvidenceCount: number | null;
  readonly disclosureMismatch: boolean;
}
