import { CommandBus } from "../application/CommandBus.js";
import { QueryBus } from "../application/QueryBus.js";
import type { RepositoryBundle } from "../application/repositories/RepositoryBundle.js";

export interface ApplicationRuntime {
  readonly commands: CommandBus;
  readonly queries: QueryBus;
  readonly repositories: RepositoryBundle;
}

export function createApplication(
  repositories: RepositoryBundle
): ApplicationRuntime {
  return {
    commands: new CommandBus(),
    queries: new QueryBus(),
    repositories
  };
}
