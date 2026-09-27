import { ids, type LicenseId } from "../../contracts/ids/EntityIds.js";
import type { RouteType } from "../route/RouteType.js";

export const COMPANY_LICENSE_IDS = {
  county: ids.license("license.county"),
  intercounty: ids.license("license.intercounty"),
  intercity: ids.license("license.intercity"),
  interregional: ids.license("license.interregional"),
  tourism: ids.license("license.tourism"),
  airportExpress: ids.license("license.airport_express")
} as const;

export function requiredLicenseIdsForRouteType(
  routeType: RouteType
): readonly LicenseId[] {
  switch (routeType) {
    case "rural":
    case "county":
      return [COMPANY_LICENSE_IDS.county];
    case "intercounty":
      return [COMPANY_LICENSE_IDS.intercounty];
    case "intercity":
      return [COMPANY_LICENSE_IDS.intercity];
    case "interprovincial":
      return [COMPANY_LICENSE_IDS.interregional];
    case "tourism":
      return [COMPANY_LICENSE_IDS.tourism];
    case "airport_express":
      return [COMPANY_LICENSE_IDS.airportExpress];
  }
}
