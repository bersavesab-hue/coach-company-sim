import type { CompanyRepository } from "./CompanyRepository.js";
import type { PassengerDemandRepository } from "./PassengerDemandRepository.js";
import type { PassengerRuntimeRepository } from "./PassengerRuntimeRepository.js";
import type { RouteRepository } from "./RouteRepository.js";
import type { ServicePlanRepository } from "./ServicePlanRepository.js";
import type { StaffRepository } from "./StaffRepository.js";
import type { StationRepository } from "./StationRepository.js";
import type { TripRepository } from "./TripRepository.js";
import type { VehicleModelRepository } from "./VehicleModelRepository.js";
import type { VehicleRepository } from "./VehicleRepository.js";
import type { WorldRepository } from "./WorldRepository.js";
import type { WorldRuntimeRepository } from "./WorldRuntimeRepository.js";

export interface RepositoryBundle {
  readonly companies: CompanyRepository;
  readonly passengerDemand: PassengerDemandRepository;
  readonly passengerRuntime: PassengerRuntimeRepository;
  readonly routes: RouteRepository;
  readonly servicePlans: ServicePlanRepository;
  readonly staff: StaffRepository;
  readonly stations: StationRepository;
  readonly trips: TripRepository;
  readonly vehicleModels: VehicleModelRepository;
  readonly vehicles: VehicleRepository;
  readonly world: WorldRepository;
  readonly worldRuntime: WorldRuntimeRepository;
}
