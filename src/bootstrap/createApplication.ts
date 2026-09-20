import { CommandBus } from "../application/CommandBus.js";
import { QueryBus } from "../application/QueryBus.js";
import { DomainEventBus } from "../application/events/DomainEventBus.js";
import { FinanceCoordinator } from "../application/finance/FinanceCoordinator.js";
import { registerFinanceQueries } from "../application/handlers/finance/registerFinanceQueries.js";
import { registerFleetHandlers } from "../application/handlers/fleet/registerFleetHandlers.js";
import { registerMapQueries } from "../application/handlers/map/registerMapQueries.js";
import { registerPassengerQueries } from "../application/handlers/passenger/registerPassengerQueries.js";
import { registerRouteHandlers } from "../application/handlers/route/registerRouteHandlers.js";
import { registerServicePlanHandlers } from "../application/handlers/schedule/registerServicePlanHandlers.js";
import { registerTripHandlers } from "../application/handlers/trip/registerTripHandlers.js";
import { registerVehicleHandlers } from "../application/handlers/vehicle/registerVehicleHandlers.js";
import { registerVehicleQueries } from "../application/handlers/vehicle/registerVehicleQueries.js";
import type { RuntimeIdAllocator } from "../application/ids/RuntimeIdAllocator.js";
import type { OperationsPolicy } from "../application/policies/OperationsPolicy.js";
import type { VehicleLifecyclePolicy } from "../application/policies/VehicleLifecyclePolicy.js";
import type { RepositoryBundle } from "../application/repositories/RepositoryBundle.js";
import { FleetOperationsCoordinator } from "../application/operations/FleetOperationsCoordinator.js";
import { DayOperationsPlanner } from "../application/services/DayOperationsPlanner.js";
import { SimulationCoordinator } from "../application/simulation/SimulationCoordinator.js";
import { VehicleSpatialIndex } from "../application/spatial/VehicleSpatialIndex.js";
import { VehicleLifecycleCoordinator } from "../application/vehicle/VehicleLifecycleCoordinator.js";
import type { EconomicPolicy } from "../simulation/finance/EconomicPolicy.js";
import type { PassengerDemandPolicy } from "../simulation/passenger/PassengerDemandPolicy.js";

export interface ApplicationDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly passengerDemandPolicy: PassengerDemandPolicy;
  readonly economicPolicy: EconomicPolicy;
  readonly vehicleLifecyclePolicy: VehicleLifecyclePolicy;
  readonly operationsPolicy: OperationsPolicy;
}

export interface ApplicationRuntime {
  readonly commands: CommandBus;
  readonly queries: QueryBus;
  readonly events: DomainEventBus;
  readonly repositories: RepositoryBundle;
  readonly finance: FinanceCoordinator;
  readonly vehicleLifecycle: VehicleLifecycleCoordinator;
  readonly fleetOperations: FleetOperationsCoordinator;
  readonly operationsPlanner: DayOperationsPlanner;
  readonly simulation: SimulationCoordinator;
}

export function createApplication(
  dependencies: ApplicationDependencies
): ApplicationRuntime {
  const commands = new CommandBus();
  const queries = new QueryBus();
  const events = new DomainEventBus();
  const vehicleIndex = new VehicleSpatialIndex();

  const finance = new FinanceCoordinator(
    dependencies.repositories,
    events,
    dependencies.economicPolicy
  );
  finance.initialize();

  const vehicleLifecycle = new VehicleLifecycleCoordinator(
    dependencies.repositories,
    events
  );

  const fleetOperations = new FleetOperationsCoordinator(
    dependencies.repositories,
    events,
    dependencies.economicPolicy,
    dependencies.vehicleLifecyclePolicy
  );

  registerVehicleHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events,
    lifecyclePolicy: dependencies.vehicleLifecyclePolicy,
    economicPolicy: dependencies.economicPolicy,
    operationsPolicy: dependencies.operationsPolicy
  });

  registerFleetHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events,
    operationsPolicy: dependencies.operationsPolicy
  });

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
    events,
    operationsPolicy: dependencies.operationsPolicy
  });

  registerMapQueries(queries, vehicleIndex);
  registerPassengerQueries(queries, dependencies.repositories);
  registerFinanceQueries(queries, dependencies.repositories);
  registerVehicleQueries(queries, dependencies.repositories);

  const operationsPlanner = new DayOperationsPlanner(
    dependencies.repositories,
    dependencies.operationsPolicy
  );
  queries.register("operations.planDay", (query) =>
    operationsPlanner.planCompanyDay(
      query.payload as Parameters<
        DayOperationsPlanner["planCompanyDay"]
      >[0]
    )
  );

  const simulation = new SimulationCoordinator(
    dependencies.repositories,
    events,
    dependencies.passengerDemandPolicy,
    finance,
    fleetOperations,
    dependencies.operationsPolicy,
    vehicleIndex
  );
  simulation.rebuildVehicleIndex();

  return {
    commands,
    queries,
    events,
    repositories: dependencies.repositories,
    finance,
    vehicleLifecycle,
    fleetOperations,
    operationsPlanner,
    simulation
  };
}
