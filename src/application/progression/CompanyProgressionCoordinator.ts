import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";
import { units } from "../../core/units/Units.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export interface CompanyProgressionSnapshot {
  readonly level: number;
  readonly reputationPermille: number;
  readonly nextLevelReputationPermille: number | null;
}

const LEVEL_THRESHOLDS = [0, 220, 350, 500, 680, 850] as const;

export function companyProgressionForReputation(
  reputationPermille: number
): CompanyProgressionSnapshot {
  const reputation = Math.max(0, Math.min(1000, reputationPermille));
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (reputation >= LEVEL_THRESHOLDS[index]!) {
      level = index + 1;
    }
  }

  return {
    level,
    reputationPermille: reputation,
    nextLevelReputationPermille:
      LEVEL_THRESHOLDS[level] ?? null
  };
}

export class CompanyProgressionCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    events: DomainEventBus
  ) {
    events.subscribe((event) => this.handle(event));
  }

  private handle(event: DomainEventEnvelope): void {
    if (event.type === "trip.completed") {
      const trip = this.repositories.trips.getById(
        event.aggregateId as any
      );
      if (!trip) return;

      const delaySeconds = Number(trip.delaySeconds);
      const delta =
        delaySeconds <= 5 * 60
          ? 2
          : delaySeconds <= 20 * 60
            ? 1
            : 0;
      if (delta > 0) {
        this.changeTripCompanyReputation(trip.routeId, delta);
      }
      return;
    }

    if (event.type === "trip.disrupted") {
      const trip = this.repositories.trips.getById(
        event.aggregateId as any
      );
      if (trip) {
        this.changeTripCompanyReputation(trip.routeId, -3);
      }
    }
  }

  private changeTripCompanyReputation(
    routeId: Parameters<RepositoryBundle["routes"]["getById"]>[0],
    delta: number
  ): void {
    const route = this.repositories.routes.getById(routeId);
    if (!route) return;

    const company = this.repositories.companies.getById(
      route.companyId
    );
    if (!company) return;

    const next = Math.max(
      0,
      Math.min(
        1000,
        Number(company.reputationPermille) + delta
      )
    );
    if (next === Number(company.reputationPermille)) return;

    this.repositories.companies.save({
      ...company,
      reputationPermille: units.permille(next)
    });
  }
}
