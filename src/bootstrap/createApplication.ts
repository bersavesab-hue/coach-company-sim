import { CommandBus } from "../application/CommandBus.js";
import { QueryBus } from "../application/QueryBus.js";
import { DomainEventBus } from "../application/events/DomainEventBus.js";
import type { RuntimeIdAllocator } from "../application/ids/RuntimeIdAllocator.js";
import type { RepositoryBundle } from "../application/repositories/RepositoryBundle.js";
import { registerRouteHandlers } from "../application/handlers/route/registerRouteHandlers.js";

export interface ApplicationDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
}

export interface ApplicationRuntime {
  readonly commands: CommandBus;
  readonly queries: QueryBus;
  readonly events: DomainEventBus;
  readonly repositories: RepositoryBundle;
}

export function createApplication(
  dependencies: ApplicationDependencies
): ApplicationRuntime {
  const commands = new CommandBus();
  const queries = new QueryBus();
  const events = new DomainEventBus();

  registerRouteHandlers(commands, {
    repositories: dependencies.repositories,
    ids: dependencies.ids,
    events
  });

  return {
    commands,
    queries,
    events,
    repositories: dependencies.repositories
  };
}
