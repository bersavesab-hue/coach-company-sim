import type { TripId } from "../../contracts/ids/EntityIds.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";

export interface TripRepository {
  getById(id: TripId): TripInstance | undefined;
  save(trip: TripInstance): void;
}
