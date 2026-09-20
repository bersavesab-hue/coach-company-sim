import type { WorldGraph } from "../../domain/world/WorldGraph.js";

export interface WorldRepository {
  get(): WorldGraph;
  replace(world: WorldGraph): void;
}
