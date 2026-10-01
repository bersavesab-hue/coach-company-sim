import type { CompanyId, StationId } from "../../contracts/ids/EntityIds.js";
import type { FleetBase } from "../../domain/station/FleetBase.js";

export interface FleetBaseRepository {
  get(companyId: CompanyId, stationId: StationId): FleetBase | undefined;
  findByCompany(companyId: CompanyId): readonly FleetBase[];
  save(base: FleetBase): void;
}
