import type { CompanyRepository } from "./CompanyRepository.js";
import type { RouteRepository } from "./RouteRepository.js";
import type { ServicePlanRepository } from "./ServicePlanRepository.js";
import type { TripRepository } from "./TripRepository.js";
import type { VehicleRepository } from "./VehicleRepository.js";
import type { WorldRepository } from "./WorldRepository.js";

export interface RepositoryBundle {
  readonly companies: CompanyRepository;
  readonly routes: RouteRepository;
  readonly servicePlans: ServicePlanRepository;
  readonly trips: TripRepository;
  readonly vehicles: VehicleRepository;
  readonly world: WorldRepository;
}
