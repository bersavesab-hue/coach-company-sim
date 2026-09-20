import { CommandBus } from "../application/CommandBus.js";
import { QueryBus } from "../application/QueryBus.js";
import { DomainEventBus } from "../application/events/DomainEventBus.js";
import { registerMapQueries } from "../application/handlers/map/registerMapQueries.js";
import { registerPassengerQueries } from "../application/handlers/passenger/registerPassengerQueries.js";
import { registerRouteHandlers } from "../application/handlers/route/registerRouteHandlers.js";
import { registerServicePlanHandlers } from "../application/handlers/schedule/registerServicePlanHandlers.js";
import { registerTripHandlers } from "../application/handlers/trip/registerTripHandlers.js";
import type { RuntimeIdAllocator } from "../application/ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../application/repositories/RepositoryBundle.js";
import { SimulationCoordinator } from "../application/simulation/SimulationCoordinator.js";
import { VehicleSpatialIndex } from "../application/spatial/VehicleSpatialIndex.js";
import type { PassengerDemandPolicy } from "../simulation/passenger/PassengerDemandPolicy.js";

export interface ApplicationDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly passengerDemandPolicy: PassengerDemandPolicy;
}

export interface ApplicationRuntime {
  readonly commands: CommandBus;
  readonly queries: QueryBus;
  readonly events: DomainEventBus;
  readonly repositories: RepositoryBundle;
  readonly simulation: SimulationCoordinator;
}

export function createApplication(
  dependencies: ApplicationDependencies
): ApplicationRuntime {
  const commands = new CommandBus();
  const queries = new QueryBus();
  const events = new DomainEventBus();
  const vehicleIndex = new VehicleSpatialIndex();

  registerRouteHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events
  });

  registerServicePlanHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events
  });

  registerTripHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events
  });

  registerMapQueries(queries, vehicleIndex);
  registerPassengerQueries(queries, dependencies.repositories);

  const simulation = new SimulationCoordinator(
    dependencies.repositories,
    events,
    dependencies.passengerDemandPolicy,
    vehicleIndex
  );
  simulation.rebuildVehicleIndex();

  return {
    commands,
    queries,
    events,
    repositories: dependencies.repositories,
    simulation
  };
}
