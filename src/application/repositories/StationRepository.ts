import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { Station } from "../../domain/station/Station.js";

export interface StationRepository {
  getById(id: StationId): Station | undefined;
}
