import type { RouteBusinessDto, RouteBusinessHealth } from "../../contracts/dto/RouteBusinessDto.js";
import type { RouteId, StationId } from "../../contracts/ids/EntityIds.js";
import { gameDayAt } from "../../core/time/GameTime.js";
import {
  creditTotalCents,
  debitTotalCents
} from "../../domain/finance/LedgerMath.js";
import type { FinanceAccount } from "../../domain/finance/FinanceAccount.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

const TRIP_EXPENSE_ACCOUNTS: readonly FinanceAccount[] = [
  "energy_expense",
  "road_toll_expense",
  "station_fee_expense",
  "driver_wage_expense",
  "employer_burden_expense"
];

export class RouteBusinessProjection {
  constructor(
    private readonly repositories: RepositoryBundle
  ) {}

  snapshot(
    routeId: RouteId,
    gameDay: number
  ): RouteBusinessDto | null {
    const route = this.repositories.routes.getById(routeId);
    if (!route) return null;

    const trips = (
      this.repositories.trips.findByRoute?.(routeId) ?? []
    ).filter(
      (trip) =>
        gameDayAt(trip.plannedDepartureGameSecond) === gameDay
    );

    const departed = trips.filter(
      (trip) => trip.actualDepartureGameSecond !== null
    );
    const passengersBoarded = trips.reduce(
      (sum, trip) =>
        sum +
        (
          trip.boardedPassengerCountTotal ??
          trip.onboardPassengerGroups.reduce(
            (inner, group) => inner + group.count,
            0
          )
        ),
      0
    );

    const routeDistanceM = this.routeDistanceM(route);
    let passengerDistanceM = 0;
    let capacityDistanceM = 0;
    let fallbackSeatCapacity = 0;

    for (const trip of departed) {
      passengerDistanceM +=
        trip.passengerDistanceMTotal ?? 0;
      const vehicle =
        trip.vehicleId === null
          ? undefined
          : this.repositories.vehicles.getById(trip.vehicleId);
      if (!vehicle) continue;
      capacityDistanceM +=
        vehicle.seatCapacity * routeDistanceM;
      fallbackSeatCapacity += vehicle.seatCapacity;
    }

    let loadFactorPermille =
      capacityDistanceM > 0
        ? Math.floor(
            (passengerDistanceM * 1000) /
              capacityDistanceM
          )
        : 0;

    if (
      loadFactorPermille === 0 &&
      passengersBoarded > 0 &&
      fallbackSeatCapacity > 0
    ) {
      loadFactorPermille = Math.floor(
        (passengersBoarded * 1000) /
          fallbackSeatCapacity
      );
    }
    loadFactorPermille = Math.max(
      0,
      Math.min(1000, loadFactorPermille)
    );

    const passengerRuntime =
      this.repositories.passengerRuntime.get();
    let waitingPassengers = 0;
    let generatedPassengers = 0;
    let abandonedPassengers = 0;

    for (const [origin, destination] of routeOdPairs(route)) {
      waitingPassengers += passengerRuntime.waitingCount(
        origin,
        destination
      );
      generatedPassengers += passengerRuntime.generatedCount(
        gameDay,
        origin,
        destination
      );
      abandonedPassengers += passengerRuntime.abandonedCount(
        gameDay,
        origin,
        destination
      );
    }

    const entries = trips.flatMap((trip) =>
      this.repositories.finance.ledgerEntriesByTrip(trip.id)
    );
    const grossTicketSalesCents = entries
      .filter((entry) => entry.kind === "ticket_sale")
      .reduce(
        (sum, entry) =>
          sum +
          entry.postings
            .filter(
              (posting) =>
                posting.account === "cash" &&
                posting.side === "debit"
            )
            .reduce(
              (inner, posting) =>
                inner + Number(posting.amountCents),
              0
            ),
        0
      );
    const netPassengerRevenueCents = creditTotalCents(
      entries,
      "passenger_revenue"
    );
    const accountingVariableCostCents =
      TRIP_EXPENSE_ACCOUNTS.reduce(
        (sum, account) =>
          sum + debitTotalCents(entries, account),
        0
      );
    const managementCostCents = trips.reduce(
      (sum, trip) =>
        sum +
        this.repositories.finance
          .managementCostsByTrip(trip.id)
          .reduce(
            (inner, entry) =>
              inner + Number(entry.amountCents),
            0
          ),
      0
    );
    const contributionProfitCents =
      netPassengerRevenueCents -
      accountingVariableCostCents -
      managementCostCents;

    return {
      routeId,
      gameDay,
      tripsPlanned: trips.length,
      tripsDeparted: departed.length,
      tripsCompleted: trips.filter(
        (trip) => trip.status === "completed"
      ).length,
      tripsDisrupted: trips.filter(
        (trip) => trip.status === "disrupted"
      ).length,
      passengersBoarded,
      loadFactorPermille,
      waitingPassengers,
      generatedPassengers,
      abandonedPassengers,
      grossTicketSalesCents,
      netPassengerRevenueCents,
      accountingVariableCostCents,
      managementCostCents,
      contributionProfitCents,
      averageFareCents:
        passengersBoarded <= 0
          ? 0
          : Math.round(
              grossTicketSalesCents / passengersBoarded
            ),
      profitPerDepartedTripCents:
        departed.length <= 0
          ? 0
          : Math.round(
              contributionProfitCents / departed.length
            ),
      health: routeHealth(
        departed.length,
        loadFactorPermille,
        waitingPassengers,
        passengersBoarded
      )
    };
  }

  private routeDistanceM(route: PassengerRoute): number {
    const world = this.repositories.world.get();
    return route.pathLegs.reduce(
      (sum, leg) =>
        sum +
        Number(
          world.getRoad(leg.roadSegmentId)?.lengthM ?? 0
        ),
      0
    );
  }
}

function routeOdPairs(
  route: PassengerRoute
): readonly (readonly [StationId, StationId])[] {
  const pairs: Array<readonly [StationId, StationId]> = [];
  for (
    let originIndex = 0;
    originIndex < route.stopPoints.length - 1;
    originIndex += 1
  ) {
    for (
      let destinationIndex = originIndex + 1;
      destinationIndex < route.stopPoints.length;
      destinationIndex += 1
    ) {
      pairs.push([
        route.stopPoints[originIndex]!.stationId,
        route.stopPoints[destinationIndex]!.stationId
      ]);
    }
  }
  return pairs;
}

function routeHealth(
  departedTrips: number,
  loadFactorPermille: number,
  waitingPassengers: number,
  passengersBoarded: number
): RouteBusinessHealth {
  if (departedTrips <= 0) return "no_service";
  if (
    loadFactorPermille >= 900 ||
    waitingPassengers >=
      Math.max(30, Math.floor(passengersBoarded * 0.5))
  ) {
    return "overloaded";
  }
  if (
    loadFactorPermille >= 750 ||
    waitingPassengers >= 15
  ) {
    return "busy";
  }
  if (loadFactorPermille >= 400) {
    return "balanced";
  }
  return "weak";
}
