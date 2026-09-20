import type { RouteId } from "../../contracts/ids/EntityIds.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";

export interface RouteRepository {
  getById(id: RouteId): PassengerRoute | undefined;
  save(route: PassengerRoute): void;
}
