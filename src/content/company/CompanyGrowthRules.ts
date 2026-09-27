import type { LicenseId } from "../../contracts/ids/EntityIds.js";
import {
  COMPANY_LICENSE_IDS,
  requiredLicenseIdsForRouteType
} from "../../domain/company/CompanyLicenseRules.js";
import type { RouteType } from "../../domain/route/RouteType.js";

export type CompanyLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface CompanyLevelDefinition {
  readonly level: CompanyLevel;
  readonly title: string;
  readonly minimumReputationPermille: number;
  readonly grantedLicenseId: LicenseId;
  readonly grantedLicenseName: string;
}

export const COMPANY_LEVELS: readonly CompanyLevelDefinition[] = [
  {
    level: 1,
    title: "地方客运公司",
    minimumReputationPermille: 0,
    grantedLicenseId: COMPANY_LICENSE_IDS.county,
    grantedLicenseName: "县域客运许可"
  },
  {
    level: 2,
    title: "县际客运公司",
    minimumReputationPermille: 220,
    grantedLicenseId: COMPANY_LICENSE_IDS.intercounty,
    grantedLicenseName: "跨县客运许可"
  },
  {
    level: 3,
    title: "区域客运公司",
    minimumReputationPermille: 350,
    grantedLicenseId: COMPANY_LICENSE_IDS.intercity,
    grantedLicenseName: "城际客运许可"
  },
  {
    level: 4,
    title: "干线客运集团",
    minimumReputationPermille: 500,
    grantedLicenseId: COMPANY_LICENSE_IDS.interregional,
    grantedLicenseName: "跨区干线许可"
  },
  {
    level: 5,
    title: "全国客运集团",
    minimumReputationPermille: 680,
    grantedLicenseId: COMPANY_LICENSE_IDS.tourism,
    grantedLicenseName: "旅游客运许可"
  },
  {
    level: 6,
    title: "综合客运集团",
    minimumReputationPermille: 850,
    grantedLicenseId: COMPANY_LICENSE_IDS.airportExpress,
    grantedLicenseName: "机场快线许可"
  }
];

export function companyLevelDefinitionForReputation(
  reputationPermille: number
): CompanyLevelDefinition {
  const reputation = Math.max(
    0,
    Math.min(1000, Math.floor(reputationPermille))
  );
  let current = COMPANY_LEVELS[0]!;
  for (const level of COMPANY_LEVELS) {
    if (reputation >= level.minimumReputationPermille) {
      current = level;
    }
  }
  return current;
}

export function companyLevelForReputation(
  reputationPermille: number
): CompanyLevel {
  return companyLevelDefinitionForReputation(
    reputationPermille
  ).level;
}

export function companyLicenseIdsForReputation(
  reputationPermille: number
): readonly LicenseId[] {
  const level = companyLevelForReputation(reputationPermille);
  return COMPANY_LEVELS
    .filter((value) => value.level <= level)
    .map((value) => value.grantedLicenseId);
}

export function licenseName(
  licenseId: LicenseId
): string {
  return (
    COMPANY_LEVELS.find(
      (value) => value.grantedLicenseId === licenseId
    )?.grantedLicenseName ?? String(licenseId)
  );
}

export function requiredLicenseForRouteType(
  routeType: RouteType
): {
  readonly id: LicenseId;
  readonly name: string;
} {
  const id = requiredLicenseIdsForRouteType(routeType)[0]!;
  return { id, name: licenseName(id) };
}

export function standardRouteTypeForDistanceM(
  distanceM: number
): RouteType {
  if (distanceM <= 280_000) return "county";
  if (distanceM <= 550_000) return "intercounty";
  if (distanceM <= 900_000) return "intercity";
  return "interprovincial";
}

export function routeTypeLabel(
  routeType: RouteType
): string {
  switch (routeType) {
    case "rural": return "乡镇支线";
    case "county": return "县域线路";
    case "intercounty": return "跨县线路";
    case "intercity": return "城际线路";
    case "interprovincial": return "跨区干线";
    case "tourism": return "旅游专线";
    case "airport_express": return "机场快线";
  }
}
