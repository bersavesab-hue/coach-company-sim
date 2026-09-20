import type {
  CompanyId,
  StaffId,
  StationId,
  TripId
} from "../../src/contracts/ids/EntityIds.js";
import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Driver } from "../../src/domain/staff/Driver.js";

export function createTestDriver(input: {
  readonly id?: StaffId;
  readonly companyId?: CompanyId;
  readonly stationId?: StationId | null;
  readonly status?: Driver["status"];
  readonly activeTripId?: TripId | null;
  readonly qualifiedVehicleClasses?: readonly string[];
} = {}): Driver {
  return {
    id: input.id ?? ids.staff("staff.00000001"),
    companyId: input.companyId ?? ids.company("company.00000001"),
    name: "测试司机",
    status: input.status ?? "available",
    qualifiedVehicleClasses:
      input.qualifiedVehicleClasses ?? ["county_midibus"],
    currentStationId: input.stationId ?? null,
    availableAtGameSecond: units.gameSecond(0),
    dutyStartedAtGameSecond: null,
    lastDutyEndedAtGameSecond: null,
    continuousDrivingSeconds: 0,
    activeTripId: input.activeTripId ?? null,
    activeFleetTaskId: null
  };
}
