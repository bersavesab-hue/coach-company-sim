import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";
import {
  COMPANY_LEVELS,
  companyLevelDefinitionForReputation,
  companyLicenseIdsForReputation
} from "../../content/company/CompanyGrowthRules.js";
import { units } from "../../core/units/Units.js";
import type { Company } from "../../domain/company/Company.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export interface CompanyProgressionSnapshot {
  readonly level: number;
  readonly levelTitle: string;
  readonly reputationPermille: number;
  readonly currentLicenseNames: readonly string[];
  readonly nextLevelReputationPermille: number | null;
  readonly nextLevelTitle: string | null;
  readonly nextLicenseName: string | null;
}

export function companyProgressionForReputation(
  reputationPermille: number
): CompanyProgressionSnapshot {
  const reputation = Math.max(0, Math.min(1000, reputationPermille));
  const current =
    companyLevelDefinitionForReputation(reputation);
  const next =
    COMPANY_LEVELS.find(
      (value) => value.level === current.level + 1
    ) ?? null;

  return {
    level: current.level,
    levelTitle: current.title,
    reputationPermille: reputation,
    currentLicenseNames:
      COMPANY_LEVELS
        .filter((value) => value.level <= current.level)
        .map((value) => value.grantedLicenseName),
    nextLevelReputationPermille:
      next?.minimumReputationPermille ?? null,
    nextLevelTitle: next?.title ?? null,
    nextLicenseName: next?.grantedLicenseName ?? null
  };
}

export function synchronizeCompanyLicenses(
  company: Company
): Company {
  const expected =
    companyLicenseIdsForReputation(
      Number(company.reputationPermille)
    );
  const same =
    expected.length === company.licenseIds.length &&
    expected.every(
      (id, index) => id === company.licenseIds[index]
    );
  return same
    ? company
    : { ...company, licenseIds: expected };
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

    this.repositories.companies.save(
      synchronizeCompanyLicenses({
        ...company,
        reputationPermille: units.permille(next)
      })
    );
  }
}
