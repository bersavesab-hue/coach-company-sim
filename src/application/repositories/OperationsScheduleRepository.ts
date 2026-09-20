import type {
  CompanyId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import type { CommittedOperationsSchedule } from "../../domain/operations/CommittedOperationsSchedule.js";

export interface OperationsScheduleRepository {
  getByCompanyAndDay(
    companyId: CompanyId,
    gameDay: number
  ): CommittedOperationsSchedule | undefined;

  findActive(): readonly CommittedOperationsSchedule[];

  findByTrip(
    tripId: TripId
  ): CommittedOperationsSchedule | undefined;

  save(schedule: CommittedOperationsSchedule): void;
}
