import type {
  CompanyId,
  StaffId
} from "../../contracts/ids/EntityIds.js";
import type { Driver } from "../../domain/staff/Driver.js";

export interface StaffRepository {
  getDriverById(id: StaffId): Driver | undefined;
  findDriversByCompany(companyId: CompanyId): readonly Driver[];
  saveDriver(driver: Driver): void;
}
