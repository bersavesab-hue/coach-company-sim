import type {
  CompanyId,
  LicenseId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type { Permille } from "../../core/units/Units.js";
import type { CompanyStatus } from "./CompanyStatus.js";

export interface Company {
  readonly id: CompanyId;
  readonly name: string;
  readonly status: CompanyStatus;
  readonly reputationPermille: Permille;
  readonly licenseIds: readonly LicenseId[];
  readonly homeStationId: StationId | null;
}
