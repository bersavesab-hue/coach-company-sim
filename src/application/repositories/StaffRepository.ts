import type { StaffId } from "../../contracts/ids/EntityIds.js";
import type { Driver } from "../../domain/staff/Driver.js";

export interface StaffRepository {
  getDriverById(id: StaffId): Driver | undefined;
  saveDriver(driver: Driver): void;
}
