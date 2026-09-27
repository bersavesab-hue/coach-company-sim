import type { RouteId } from "../ids/EntityIds.js";

export type RouteBusinessHealth =
  | "no_service"
  | "weak"
  | "balanced"
  | "busy"
  | "overloaded";

export interface RouteBusinessDto {
  readonly routeId: RouteId;
  readonly gameDay: number;
  readonly tripsPlanned: number;
  readonly tripsDeparted: number;
  readonly tripsCompleted: number;
  readonly tripsDisrupted: number;
  readonly passengersBoarded: number;
  readonly loadFactorPermille: number;
  readonly waitingPassengers: number;
  readonly generatedPassengers: number;
  readonly abandonedPassengers: number;
  readonly grossTicketSalesCents: number;
  readonly netPassengerRevenueCents: number;
  readonly accountingVariableCostCents: number;
  readonly managementCostCents: number;
  readonly contributionProfitCents: number;
  readonly averageFareCents: number;
  readonly profitPerDepartedTripCents: number;
  readonly health: RouteBusinessHealth;
}
