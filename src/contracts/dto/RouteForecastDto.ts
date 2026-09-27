import type { RouteId } from "../ids/EntityIds.js";
import type { RouteBusinessDto } from "./RouteBusinessDto.js";

export type RouteForecastCostBasis =
  | "route_history"
  | "owned_fleet"
  | "catalog_model"
  | "unavailable";

export interface RouteForecastInputDto {
  readonly routeId: RouteId;
  readonly gameDay: number;
  readonly vehicleClass: string;
  readonly startSecondOfDay: number;
  readonly endSecondOfDay: number;
  readonly intervalSeconds: number;
  readonly fareMultiplierPermille: number;
  readonly includeExistingPlans: boolean;
}

export interface RouteForecastDto {
  readonly routeId: RouteId;
  readonly gameDay: number;
  readonly departuresPerDay: number;
  readonly existingDeparturesPerDay: number;
  readonly proposedDeparturesPerDay: number;
  readonly fareMultiplierPermille: number;
  readonly estimatedGeneratedPassengers: number;
  readonly currentWaitingPassengers: number;
  readonly projectedBoardedPassengers: number;
  readonly projectedLoadFactorPermille: number;
  readonly projectedGrossTicketSalesCents: number;
  readonly projectedNetPassengerRevenueCents: number;
  readonly projectedVariableCostCents: number;
  readonly projectedContributionProfitCents: number;
  readonly projectedProfitPerTripCents: number;
  readonly demandChangePermille: number | null;
  readonly requiredVehicles: number;
  readonly ownedVehiclesInClass: number;
  readonly representativeSeatCapacity: number;
  readonly representativeDrivingSeconds: number;
  readonly costBasis: RouteForecastCostBasis;
  readonly warnings: readonly string[];
}

export interface RouteBusinessHistoryDto {
  readonly routeId: RouteId;
  readonly points: readonly RouteBusinessDto[];
}
