import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";
import { calculateFareQuote } from "../../domain/finance/FareCalculator.js";
import type { PassengerDemandProfile } from "../../domain/passenger/PassengerDemandProfile.js";
import { generateDepartureSlots } from "../../domain/schedule/ScheduleExpander.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import { generatePassengerDemand } from "../../simulation/passenger/DemandGeneration.js";
import type { PassengerDemandPolicy } from "../../simulation/passenger/PassengerDemandPolicy.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

interface OdServiceSnapshot {
  readonly departuresPerDay: number;
  readonly bestFareRatioPermille: number;
}

export class PassengerDemandCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    private readonly policy: PassengerDemandPolicy
  ) {}

  advanceTo(targetGameSecond: GameSecond): void {
    const runtime = this.repositories.passengerRuntime.get();
    let cursor = Number(runtime.lastDemandGeneratedGameSecond());
    const target = Number(targetGameSecond);

    if (target <= cursor) return;

    while (cursor < target) {
      const gameDay = Math.floor(cursor / SECONDS_PER_DAY) + 1;
      const secondOfDay = cursor % SECONDS_PER_DAY;
      const nextDayStart = gameDay * SECONDS_PER_DAY;
      const nextHourBoundary =
        cursor + (3600 - (secondOfDay % 3600 || 3600));
      const intervalEnd = Math.min(
        target,
        nextDayStart,
        nextHourBoundary > cursor
          ? nextHourBoundary
          : cursor + 3600
      );
      const elapsedSeconds = intervalEnd - cursor;
      runtime.pruneDailyFlowBeforeDay(
        Math.max(1, gameDay - 14)
      );

      for (const profile of this.repositories.passengerDemand.all()) {
        if (profile.originStationId === profile.destinationStationId) {
          continue;
        }

        const service = this.serviceForOd(
          profile.originStationId,
          profile.destinationStationId,
          gameDay
        );
        this.applyQueueAbandonment(
          profile,
          service.departuresPerDay,
          elapsedSeconds,
          gameDay
        );

        const frequency =
          this.policy.frequencyMultiplierPermille(
            service.departuresPerDay
          );
        const fare =
          this.policy.fareMultiplierPermille?.(
            service.bestFareRatioPermille
          ) ?? units.multiplierPermille(1000);
        const timeOfDay =
          this.policy.timeOfDayMultiplierPermille?.(
            secondOfDay
          ) ?? units.multiplierPermille(1000);
        const combined = units.multiplierPermille(
          Math.floor(
            (
              Number(frequency) *
              Number(fare) *
              Number(timeOfDay)
            ) /
              1_000_000
          )
        );

        const generated = generatePassengerDemand(
          profile.basePassengersPerHour,
          combined,
          elapsedSeconds,
          runtime.demandRemainder(
            profile.originStationId,
            profile.destinationStationId
          )
        );

        runtime.setDemandRemainder(
          profile.originStationId,
          profile.destinationStationId,
          generated.remainderUnits
        );

        if (generated.generatedPassengers > 0) {
          runtime.addWaiting(
            profile.originStationId,
            profile.destinationStationId,
            generated.generatedPassengers
          );
          runtime.recordGenerated(
            gameDay,
            profile.originStationId,
            profile.destinationStationId,
            generated.generatedPassengers
          );

          this.events.publish(
            createSimulationDomainEvent(
              "passengers.generated",
              "passenger",
              `${profile.originStationId}->${profile.destinationStationId}`,
              units.gameSecond(intervalEnd),
              {
                originStationId: profile.originStationId,
                destinationStationId: profile.destinationStationId,
                count: generated.generatedPassengers,
                departuresPerDay: service.departuresPerDay,
                fareRatioPermille:
                  service.bestFareRatioPermille,
                effectiveDemandMultiplierPermille:
                  Number(combined)
              }
            )
          );
        }
      }

      cursor = intervalEnd;
      runtime.setLastDemandGeneratedGameSecond(
        units.gameSecond(cursor)
      );
    }

    this.repositories.passengerRuntime.replace(runtime);
  }

  private serviceForOd(
    originStationId: StationId,
    destinationStationId: StationId,
    gameDay: number
  ): OdServiceSnapshot {
    let departures = 0;
    let bestFareRatioPermille = 1000;
    let hasPricedService = false;

    for (const route of this.repositories.routes.findActive()) {
      if (
        !routeServesOd(
          route.stopPoints.map((stop) => stop.stationId),
          originStationId,
          destinationStationId
        )
      ) {
        continue;
      }

      let routeDepartures = 0;
      for (const plan of this.repositories.servicePlans.findByRoute(route.id)) {
        const slots = generateDepartureSlots(plan, gameDay);
        if (slots.ok) {
          routeDepartures += slots.value.length;
        }
      }

      if (routeDepartures <= 0) continue;
      departures += routeDepartures;

      const farePolicy =
        this.repositories.finance.getFarePolicy(
          route.farePolicyId
        );
      if (!farePolicy) continue;

      const quote = calculateFareQuote(
        route,
        originStationId,
        destinationStationId,
        this.repositories.world.get(),
        farePolicy
      );
      if (!quote.ok || Number(quote.value.referenceFareCents) <= 0) {
        continue;
      }

      const ratio = Math.round(
        (Number(quote.value.fareCents) * 1000) /
          Number(quote.value.referenceFareCents)
      );
      bestFareRatioPermille = hasPricedService
        ? Math.min(bestFareRatioPermille, ratio)
        : ratio;
      hasPricedService = true;
    }

    return {
      departuresPerDay: departures,
      bestFareRatioPermille:
        hasPricedService ? bestFareRatioPermille : 1000
    };
  }

  private applyQueueAbandonment(
    profile: PassengerDemandProfile,
    departuresPerDay: number,
    elapsedSeconds: number,
    gameDay: number
  ): void {
    const rate =
      this.policy.queueAbandonmentPermillePerHour?.(
        departuresPerDay
      );
    if (!rate || Number(rate) <= 0) return;

    const runtime = this.repositories.passengerRuntime.get();
    const waiting = runtime.waitingCount(
      profile.originStationId,
      profile.destinationStationId
    );
    if (waiting <= 0) return;

    let leaving = Math.floor(
      (
        waiting *
        Number(rate) *
        elapsedSeconds
      ) /
        3_600_000
    );
    if (
      departuresPerDay <= 0 &&
      elapsedSeconds >= 3600 &&
      leaving === 0
    ) {
      leaving = 1;
    }

    if (leaving > 0) {
      const abandoned = runtime.takeWaiting(
        profile.originStationId,
        profile.destinationStationId,
        leaving
      );
      runtime.recordAbandoned(
        gameDay,
        profile.originStationId,
        profile.destinationStationId,
        abandoned
      );
    }
  }
}

function routeServesOd(
  stationIds: readonly StationId[],
  originStationId: StationId,
  destinationStationId: StationId
): boolean {
  const originIndex = stationIds.indexOf(originStationId);
  const destinationIndex = stationIds.indexOf(destinationStationId);

  return (
    originIndex >= 0 &&
    destinationIndex > originIndex
  );
}
