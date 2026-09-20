import type { StationQueueDto } from "../../../contracts/dto/PassengerDto.js";
import { ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type { StationQueueQuery } from "../../queries/passenger/PassengerQueries.js";

export function registerPassengerQueries(
  queries: QueryBus,
  repositories: RepositoryBundle
): void {
  queries.register("passenger.stationQueue", (query) => {
    const typed = query as StationQueueQuery;
    const groups = repositories.passengerRuntime
      .get()
      .queueAt(typed.payload.stationId);

    const dto: StationQueueDto = {
      stationId: typed.payload.stationId,
      groups,
      totalWaiting: groups.reduce((sum, group) => sum + group.count, 0)
    };

    return ok(dto);
  });
}
