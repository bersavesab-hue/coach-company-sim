import type {
  CompanyId,
  RouteId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type {
  RouteBusinessHistoryDto,
  RouteForecastDto,
  RouteForecastInputDto,
  RouteForecastCostBasis
} from "../../contracts/dto/RouteForecastDto.js";
import { units } from "../../core/units/Units.js";
import { effectiveProfileDemandPermille } from "../../content/passenger/PassengerDemandPattern.js";
import { calculateFareQuote } from "../../domain/finance/FareCalculator.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import { generateDepartureSlots } from "../../domain/schedule/ScheduleExpander.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { EconomicPolicy } from "../../simulation/finance/EconomicPolicy.js";
import type { PassengerDemandPolicy } from "../../simulation/passenger/PassengerDemandPolicy.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { estimateRouteDrivingSeconds } from "./TripTiming.js";
import type { RouteBusinessProjection } from "./RouteBusinessProjection.js";

interface DemandEstimate {
  readonly generatedPassengers: number;
  readonly passengerDistanceM: number;
  readonly grossTicketSalesCents: number;
  readonly netPassengerRevenueCents: number;
  readonly currentWaitingPassengers: number;
}

interface VehicleBasis {
  readonly model: VehicleModel | null;
  readonly seatCapacity: number;
  readonly ownedCount: number;
  readonly costBasis: RouteForecastCostBasis;
}

export class RouteForecastService {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly routeBusiness: RouteBusinessProjection,
    private readonly passengerDemandPolicy: PassengerDemandPolicy,
    private readonly economicPolicy: EconomicPolicy,
    private readonly operationsPolicy: OperationsPolicy
  ) {}

  history(
    routeId: RouteId,
    currentGameDay: number,
    days = 7
  ): RouteBusinessHistoryDto {
    const start = Math.max(1, currentGameDay - Math.max(1, days) + 1);
    const points = [];
    for (let gameDay = start; gameDay <= currentGameDay; gameDay += 1) {
      const point = this.routeBusiness.snapshot(routeId, gameDay);
      if (point) points.push(point);
    }
    return { routeId, points };
  }

  forecastFare(
    routeId: RouteId,
    gameDay: number,
    fareMultiplierPermille: number
  ): RouteForecastDto | null {
    const route = this.repositories.routes.getById(routeId);
    if (!route) return null;

    const activePlans = this.repositories.servicePlans
      .findByRoute(routeId)
      .filter((plan) => plan.status === "active");
    const departures = activePlans.reduce(
      (sum, plan) => {
        const slots = generateDepartureSlots(plan, gameDay);
        return sum + (slots.ok ? slots.value.length : 0);
      },
      0
    );
    const vehicleClass =
      activePlans[0]?.requiredVehicleClass ?? "";
    const bounds = planTimeBounds(activePlans);

    return this.forecast({
      routeId,
      gameDay,
      vehicleClass,
      startSecondOfDay: bounds.start,
      endSecondOfDay: bounds.end,
      intervalSeconds:
        departures > 1
          ? Math.max(
              15 * 60,
              Math.floor(
                (bounds.end - bounds.start) /
                  Math.max(1, departures - 1)
              )
            )
          : 24 * 3600,
      fareMultiplierPermille,
      includeExistingPlans: false
    }, departures);
  }

  forecast(
    input: RouteForecastInputDto,
    forcedProposedDepartures?: number
  ): RouteForecastDto | null {
    const route = this.repositories.routes.getById(input.routeId);
    if (!route) return null;

    const proposedDepartures =
      forcedProposedDepartures ??
      countIntervalDepartures(
        input.startSecondOfDay,
        input.endSecondOfDay,
        input.intervalSeconds
      );
    const existingDepartures =
      input.includeExistingPlans
        ? this.existingDepartures(
            route.id,
            input.gameDay
          )
        : 0;
    const departures =
      proposedDepartures + existingDepartures;

    const basis = this.vehicleBasis(
      route.companyId,
      input.vehicleClass
    );
    const model = basis.model;
    const routeDistanceM = routeDistance(
      route,
      this.repositories
    );
    const drivingSeconds =
      model === null
        ? 0
        : estimateRouteDrivingSeconds(
            route,
            model,
            this.repositories.world.get()
          );

    const demand = this.estimateDemand(
      route,
      departures,
      input.fareMultiplierPermille,
      input.gameDay
    );
    const capacityDistanceM =
      departures *
      Math.max(0, basis.seatCapacity) *
      routeDistanceM;
    const demandDistanceM =
      demand.passengerDistanceM +
      this.waitingPassengerDistanceM(route);

    const servedScale =
      demandDistanceM <= 0
        ? 0
        : capacityDistanceM <= 0
          ? 0
          : Math.min(1, capacityDistanceM / demandDistanceM);
    const projectedBoardedPassengers = Math.max(
      0,
      Math.round(
        (
          demand.generatedPassengers +
          demand.currentWaitingPassengers
        ) * servedScale
      )
    );
    const projectedPassengerDistanceM = Math.round(
      demandDistanceM * servedScale
    );
    const projectedLoadFactorPermille =
      capacityDistanceM <= 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1000,
              Math.round(
                (projectedPassengerDistanceM * 1000) /
                  capacityDistanceM
              )
            )
          );

    const revenueScale =
      demand.generatedPassengers +
        demand.currentWaitingPassengers <=
      0
        ? 0
        : projectedBoardedPassengers /
          (
            demand.generatedPassengers +
            demand.currentWaitingPassengers
          );
    const projectedGrossTicketSalesCents = Math.round(
      demand.grossTicketSalesCents * revenueScale
    );
    const projectedNetPassengerRevenueCents = Math.round(
      demand.netPassengerRevenueCents * revenueScale
    );

    const cost = this.estimateCost(
      route,
      input.gameDay,
      departures,
      projectedBoardedPassengers,
      basis,
      drivingSeconds,
      routeDistanceM,
      forcedProposedDepartures !== undefined
    );
    const projectedContributionProfitCents =
      projectedNetPassengerRevenueCents -
      cost.costCents;

    const currentFareMultiplier = Number(
      route.fareMultiplierPermille ?? 1000
    );
    const currentDepartures = this.existingDepartures(
      route.id,
      input.gameDay
    );
    const currentDemand =
      currentDepartures > 0
        ? this.estimateDemand(
            route,
            currentDepartures,
            currentFareMultiplier
          ).generatedPassengers
        : 0;
    const demandChangePermille =
      currentDemand <= 0
        ? null
        : Math.round(
            (
              demand.generatedPassengers -
              currentDemand
            ) *
              1000 /
              currentDemand
          );

    const requiredVehicles =
      departures <= 0 || drivingSeconds <= 0
        ? 0
        : Math.min(
            departures,
            Math.max(
              1,
              Math.ceil(
                (
                  drivingSeconds * 2 +
                  30 * 60
                ) /
                  Math.max(
                    15 * 60,
                    input.intervalSeconds
                  )
              )
            )
          );

    const warnings: string[] = [];
    if (departures <= 0) {
      warnings.push("没有有效班次，预计不会形成新增客流。");
    }
    if (basis.seatCapacity <= 0) {
      warnings.push("所选车型没有可用容量数据，运力预测不可用。");
    }
    if (requiredVehicles > basis.ownedCount) {
      warnings.push(
        `预计需要 ${requiredVehicles} 辆，当前同级车辆仅 ${basis.ownedCount} 辆。`
      );
    }
    if (projectedLoadFactorPermille >= 900) {
      warnings.push("预计上座率超过 90%，高峰可能出现积压。");
    } else if (
      departures > 0 &&
      projectedLoadFactorPermille < 350
    ) {
      warnings.push("预计上座率低于 35%，班次可能过密或票价偏高。");
    }
    if (
      departures > 0 &&
      projectedContributionProfitCents < 0
    ) {
      warnings.push("预计贡献利润为负，需要调整票价、班次或车型。");
    }

    return {
      routeId: route.id,
      gameDay: input.gameDay,
      departuresPerDay: departures,
      existingDeparturesPerDay: existingDepartures,
      proposedDeparturesPerDay: proposedDepartures,
      fareMultiplierPermille:
        input.fareMultiplierPermille,
      estimatedGeneratedPassengers:
        demand.generatedPassengers,
      currentWaitingPassengers:
        demand.currentWaitingPassengers,
      projectedBoardedPassengers,
      projectedLoadFactorPermille,
      projectedGrossTicketSalesCents,
      projectedNetPassengerRevenueCents,
      projectedVariableCostCents: cost.costCents,
      projectedContributionProfitCents,
      projectedProfitPerTripCents:
        departures <= 0
          ? 0
          : Math.round(
              projectedContributionProfitCents /
                departures
            ),
      demandChangePermille,
      requiredVehicles,
      ownedVehiclesInClass: basis.ownedCount,
      representativeSeatCapacity: basis.seatCapacity,
      representativeDrivingSeconds: drivingSeconds,
      costBasis: cost.costBasis,
      warnings
    };
  }

  private existingDepartures(
    routeId: RouteId,
    gameDay: number
  ): number {
    return this.repositories.servicePlans
      .findByRoute(routeId)
      .filter((plan) => plan.status === "active")
      .reduce((sum, plan) => {
        const slots = generateDepartureSlots(plan, gameDay);
        return sum + (slots.ok ? slots.value.length : 0);
      }, 0);
  }

  private estimateDemand(
    route: PassengerRoute,
    departuresPerDay: number,
    fareMultiplierPermille: number,
    gameDay: number
  ): DemandEstimate {
    if (departuresPerDay <= 0) {
      return {
        generatedPassengers: 0,
        passengerDistanceM: 0,
        grossTicketSalesCents: 0,
        netPassengerRevenueCents: 0,
        currentWaitingPassengers:
          this.routeWaitingPassengers(route)
      };
    }

    const fareMultiplier =
      this.passengerDemandPolicy
        .fareMultiplierPermille?.(
          fareMultiplierPermille
        ) ?? units.multiplierPermille(1000);
    const frequencyMultiplier =
      this.passengerDemandPolicy
        .frequencyMultiplierPermille(
          departuresPerDay
        );
    const policy =
      this.repositories.finance.getFarePolicy(
        route.farePolicyId
      );
    if (!policy) {
      return {
        generatedPassengers: 0,
        passengerDistanceM: 0,
        grossTicketSalesCents: 0,
        netPassengerRevenueCents: 0,
        currentWaitingPassengers:
          this.routeWaitingPassengers(route)
      };
    }

    const pricedRoute: PassengerRoute = {
      ...route,
      fareMultiplierPermille:
        units.multiplierPermille(
          fareMultiplierPermille
        )
    };

    let generatedPassengers = 0;
    let passengerDistanceM = 0;
    let grossTicketSalesCents = 0;
    let netPassengerRevenueCents = 0;
    let currentWaitingPassengers = 0;

    for (const profile of this.repositories.passengerDemand.all()) {
      if (
        !routeServesOd(
          route,
          profile.originStationId,
          profile.destinationStationId
        )
      ) {
        continue;
      }

      let expected = 0;
      for (let hour = 0; hour < 24; hour += 1) {
        const time =
          this.passengerDemandPolicy
            .timeOfDayMultiplierPermille?.(
              hour * 3600
            ) ?? units.multiplierPermille(1000);
        const combined =
          combinePermille(
            Number(frequencyMultiplier),
            Number(fareMultiplier),
            Number(time),
            effectiveProfileDemandPermille(
              profile,
              gameDay
            )
          );
        expected +=
          profile.basePassengersPerHour *
          combined /
          1000;
      }

      const passengers = Math.max(0, Math.round(expected));
      const odDistanceM = routeOdDistanceM(
        route,
        profile.originStationId,
        profile.destinationStationId,
        this.repositories
      );
      const quote = calculateFareQuote(
        pricedRoute,
        profile.originStationId,
        profile.destinationStationId,
        this.repositories.world.get(),
        policy
      );
      const fare = quote.ok
        ? Number(quote.value.fareCents)
        : 0;
      const tax = Number(
        this.economicPolicy.ticketTaxCents(
          units.moneyCents(fare),
          route.id,
          units.gameSecond(0)
        )
      );

      generatedPassengers += passengers;
      passengerDistanceM += passengers * odDistanceM;
      grossTicketSalesCents += passengers * fare;
      netPassengerRevenueCents +=
        passengers * Math.max(0, fare - tax);
      currentWaitingPassengers +=
        this.repositories.passengerRuntime
          .get()
          .waitingCount(
            profile.originStationId,
            profile.destinationStationId
          );
    }

    return {
      generatedPassengers,
      passengerDistanceM,
      grossTicketSalesCents,
      netPassengerRevenueCents,
      currentWaitingPassengers
    };
  }

  private estimateCost(
    route: PassengerRoute,
    gameDay: number,
    departures: number,
    projectedPassengers: number,
    basis: VehicleBasis,
    drivingSeconds: number,
    routeDistanceM: number,
    allowHistoricalCost: boolean
  ): {
    readonly costCents: number;
    readonly costBasis: RouteForecastCostBasis;
  } {
    if (departures <= 0) {
      return { costCents: 0, costBasis: basis.costBasis };
    }

    const history = this.routeBusiness.snapshot(
      route.id,
      Math.max(1, gameDay - 1)
    );
    if (
      allowHistoricalCost &&
      history &&
      history.tripsDeparted > 0 &&
      history.accountingVariableCostCents +
        history.managementCostCents >
        0
    ) {
      const perTrip =
        (
          history.accountingVariableCostCents +
          history.managementCostCents
        ) /
        history.tripsDeparted;
      return {
        costCents: Math.round(perTrip * departures),
        costBasis: "route_history"
      };
    }

    const model = basis.model;
    if (!model) {
      return {
        costCents: 0,
        costBasis: "unavailable"
      };
    }

    const gameSecond = units.gameSecond(
      (Math.max(1, gameDay) - 1) * 86400
    );
    const world = this.repositories.world.get();
    const movementTrips =
      departures + Math.max(0, departures - 1);
    const distanceKm = routeDistanceM / 1000;

    const energyUnitsPerTrip =
      model.drivingEnergyUnitsPer100Km *
      distanceKm /
      100;
    const energyCentsPerTrip =
      energyUnitsPerTrip *
      this.economicPolicy.energyPriceMilliCentsPerUnit(
        model.energyKind,
        gameSecond
      ) /
      1000;

    let tollCentsPerTrip = 0;
    for (const leg of route.pathLegs) {
      const road = world.getRoad(leg.roadSegmentId);
      if (!road) continue;
      tollCentsPerTrip +=
        (
          Number(road.lengthM) /
          1000
        ) *
        this.economicPolicy.roadTollMilliCentsPerKm(
          road.roadClass,
          gameSecond
        ) /
        1000;
    }

    const economic =
      this.repositories.finance.getVehicleEconomicProfile(
        model.id
      );
    const wearCentsPerTrip =
      economic
        ? distanceKm *
          (
            Number(economic.maintenanceEconomicCostCentsPerKm) +
            Number(economic.economicDepreciationCentsPerKm)
          )
        : 0;

    const drivers =
      this.repositories.finance
        .driverCompensationProfilesByCompany(
          route.companyId
        );
    const driver = drivers[0];
    const driverCentsPerTrip =
      driver
        ? (
            Number(driver.drivingAllowanceCentsPerHour) *
            drivingSeconds /
            3600
          ) *
          (
            1 +
            Number(driver.employerBurdenPermille) /
              1000
          )
        : 0;

    const origin = route.stopPoints[0]?.stationId;
    const destination =
      route.stopPoints.at(-1)?.stationId;
    const stationCentsPerPassengerTrip =
      origin && destination
        ? (
            Number(
              this.economicPolicy.stationDepartureFeeCents(
                origin,
                gameSecond
              )
            ) +
            Number(
              this.economicPolicy.stationArrivalFeeCents(
                destination,
                gameSecond
              )
            )
          ) *
          departures
        : 0;
    const passengerServiceCents =
      origin
        ? Number(
            this.economicPolicy.stationPassengerServiceFeeCents(
              origin,
              projectedPassengers,
              gameSecond
            )
          )
        : 0;

    return {
      costCents: Math.round(
        movementTrips *
          (
            energyCentsPerTrip +
            tollCentsPerTrip +
            wearCentsPerTrip +
            driverCentsPerTrip
          ) +
          stationCentsPerPassengerTrip +
          passengerServiceCents
      ),
      costBasis: basis.costBasis
    };
  }

  private vehicleBasis(
    companyId: CompanyId,
    vehicleClass: string
  ): VehicleBasis {
    const owned = this.repositories.vehicles
      .findByCompany(companyId)
      .filter((vehicle) => {
        const model =
          this.repositories.vehicleModels.getById(
            vehicle.modelId
          );
        return model?.serviceClass === vehicleClass;
      });
    if (owned.length > 0) {
      const model =
        this.repositories.vehicleModels.getById(
          owned[0]!.modelId
        ) ?? null;
      return {
        model,
        seatCapacity: Math.round(
          owned.reduce(
            (sum, vehicle) =>
              sum + vehicle.seatCapacity,
            0
          ) / owned.length
        ),
        ownedCount: owned.length,
        costBasis: "owned_fleet"
      };
    }

    const catalog =
      this.repositories.vehicleModels
        .findByServiceClass?.(vehicleClass) ?? [];
    const model = catalog[0] ?? null;
    return {
      model,
      seatCapacity:
        catalog.length === 0
          ? 0
          : Math.round(
              catalog.reduce(
                (sum, value) =>
                  sum + value.seatCapacity,
                0
              ) / catalog.length
            ),
      ownedCount: 0,
      costBasis:
        model === null
          ? "unavailable"
          : "catalog_model"
    };
  }

  private routeWaitingPassengers(
    route: PassengerRoute
  ): number {
    let total = 0;
    const runtime =
      this.repositories.passengerRuntime.get();
    for (const [origin, destination] of routeOdPairs(route)) {
      total += runtime.waitingCount(
        origin,
        destination
      );
    }
    return total;
  }

  private waitingPassengerDistanceM(
    route: PassengerRoute
  ): number {
    let total = 0;
    const runtime =
      this.repositories.passengerRuntime.get();
    for (const [origin, destination] of routeOdPairs(route)) {
      total +=
        runtime.waitingCount(origin, destination) *
        routeOdDistanceM(
          route,
          origin,
          destination,
          this.repositories
        );
    }
    return total;
  }
}

function combinePermille(...values: readonly number[]): number {
  return values.reduce(
    (result, value) =>
      Math.floor(result * value / 1000),
    1000
  );
}

function countIntervalDepartures(
  startSecondOfDay: number,
  endSecondOfDay: number,
  intervalSeconds: number
): number {
  if (
    endSecondOfDay < startSecondOfDay ||
    intervalSeconds <= 0
  ) {
    return 0;
  }
  return (
    Math.floor(
      (endSecondOfDay - startSecondOfDay) /
        intervalSeconds
    ) + 1
  );
}

function planTimeBounds(
  plans: readonly {
    readonly departurePattern:
      | {
          readonly kind: "fixed_times";
          readonly secondOfDay: readonly number[];
        }
      | {
          readonly kind: "interval_window";
          readonly windows: readonly {
            readonly startSecondOfDay: number;
            readonly endSecondOfDay: number;
            readonly intervalSeconds: number;
          }[];
        };
  }[]
): { readonly start: number; readonly end: number } {
  const values: number[] = [];
  for (const plan of plans) {
    if (plan.departurePattern.kind === "fixed_times") {
      values.push(...plan.departurePattern.secondOfDay);
    } else {
      for (const window of plan.departurePattern.windows) {
        values.push(
          window.startSecondOfDay,
          window.endSecondOfDay
        );
      }
    }
  }
  return {
    start: values.length ? Math.min(...values) : 7 * 3600,
    end: values.length ? Math.max(...values) : 21 * 3600
  };
}

function routeServesOd(
  route: PassengerRoute,
  originStationId: StationId,
  destinationStationId: StationId
): boolean {
  const stationIds = route.stopPoints.map(
    (stop) => stop.stationId
  );
  const originIndex = stationIds.indexOf(originStationId);
  const destinationIndex =
    stationIds.indexOf(destinationStationId);
  return (
    originIndex >= 0 &&
    destinationIndex > originIndex
  );
}

function routeOdPairs(
  route: PassengerRoute
): readonly (readonly [StationId, StationId])[] {
  const pairs: Array<readonly [StationId, StationId]> = [];
  for (
    let origin = 0;
    origin < route.stopPoints.length - 1;
    origin += 1
  ) {
    for (
      let destination = origin + 1;
      destination < route.stopPoints.length;
      destination += 1
    ) {
      pairs.push([
        route.stopPoints[origin]!.stationId,
        route.stopPoints[destination]!.stationId
      ]);
    }
  }
  return pairs;
}

function routeDistance(
  route: PassengerRoute,
  repositories: RepositoryBundle
): number {
  const world = repositories.world.get();
  return route.pathLegs.reduce(
    (sum, leg) =>
      sum +
      Number(
        world.getRoad(leg.roadSegmentId)?.lengthM ?? 0
      ),
    0
  );
}

function routeOdDistanceM(
  route: PassengerRoute,
  originStationId: StationId,
  destinationStationId: StationId,
  repositories: RepositoryBundle
): number {
  const originIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === originStationId
  );
  const destinationIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === destinationStationId
  );
  if (originIndex < 0 || destinationIndex <= originIndex) {
    return 0;
  }

  const from =
    route.stopPoints[originIndex]!.pathLegBoundaryIndex;
  const to =
    route.stopPoints[destinationIndex]!.pathLegBoundaryIndex;
  const world = repositories.world.get();
  let distance = 0;
  for (let index = from; index < to; index += 1) {
    const leg = route.pathLegs[index];
    if (!leg) break;
    distance += Number(
      world.getRoad(leg.roadSegmentId)?.lengthM ?? 0
    );
  }
  return distance;
}
