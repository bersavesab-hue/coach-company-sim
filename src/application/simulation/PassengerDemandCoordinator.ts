import type { StationId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import { units } from "../../core/units/Units.js";
import type { PassengerDemandProfile } from "../../domain/passenger/PassengerDemandProfile.js";
import { generateDepartureSlots } from "../../domain/schedule/ScheduleExpander.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import { generatePassengerDemand } from "../../simulation/passenger/DemandGeneration.js";
import type { PassengerDemandPolicy } from "../../simulation/passenger/PassengerDemandPolicy.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

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
      const nextDayStart = gameDay * SECONDS_PER_DAY;
      const intervalEnd = Math.min(target, nextDayStart);
      const elapsedSeconds = intervalEnd - cursor;

      for (const profile of this.repositories.passengerDemand.all()) {
        if (profile.originStationId === profile.destinationStationId) {
          continue;
        }

        const departuresPerDay = this.countDeparturesForOd(
          profile.originStationId,
          profile.destinationStationId,
          gameDay
        );
        const multiplier =
          this.policy.frequencyMultiplierPermille(departuresPerDay);

        const generated = generatePassengerDemand(
          profile.basePassengersPerHour,
          multiplier,
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
                departuresPerDay
              }
            )
          );
        }
      }

      cursor = intervalEnd;
      runtime.setLastDemandGeneratedGameSecond(units.gameSecond(cursor));
    }

    this.repositories.passengerRuntime.replace(runtime);
  }

  private countDeparturesForOd(
    originStationId: StationId,
    destinationStationId: StationId,
    gameDay: number
  ): number {
    let departures = 0;

    for (const route of this.repositories.routes.findActive()) {
      if (!routeServesOd(route.stopPoints.map((stop) => stop.stationId), originStationId, destinationStationId)) {
        continue;
      }

      for (const plan of this.repositories.servicePlans.findByRoute(route.id)) {
        const slots = generateDepartureSlots(plan, gameDay);
        if (slots.ok) departures += slots.value.length;
      }
    }

    return departures;
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
