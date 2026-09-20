import type {
  CompanyId,
  RouteId
} from "../../contracts/ids/EntityIds.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";

export interface RouteRepository {
  getById(id: RouteId): PassengerRoute | undefined;
  findByCompanyAndCode(
    companyId: CompanyId,
    code: string
  ): PassengerRoute | undefined;
  findActive(): readonly PassengerRoute[];
  save(route: PassengerRoute): void;
}
