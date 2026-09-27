import type {
  PassengerNetworkSummaryDto,
  StationQueueDto
} from "../../../contracts/dto/PassengerDto.js";
import { ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type {
  PassengerNetworkSummaryQuery,
  StationQueueQuery
} from "../../queries/passenger/PassengerQueries.js";

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

  queries.register("passenger.networkSummary", (_query) => {
    const runtime = repositories.passengerRuntime.get();
    const stationIds = new Set(
      repositories.passengerDemand
        .all()
        .map((profile) => profile.originStationId)
    );

    let totalWaiting = 0;
    let busiestStationId = null as PassengerNetworkSummaryDto["busiestStationId"];
    let busiestStationWaiting = 0;

    for (const stationId of stationIds) {
      const waiting = runtime
        .queueAt(stationId)
        .reduce((sum, group) => sum + group.count, 0);
      totalWaiting += waiting;
      if (waiting > busiestStationWaiting) {
        busiestStationId = stationId;
        busiestStationWaiting = waiting;
      }
    }

    const dto: PassengerNetworkSummaryDto = {
      totalWaiting,
      busiestStationId,
      busiestStationWaiting
    };
    return ok(dto);
  });
}
