import type {
  StaffId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";
import { units } from "../../core/units/Units.js";
import type { VehicleIncidentKind } from "../../domain/vehicle/VehicleIncident.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

interface OperatingIntervalPayload {
  readonly tripId: TripId | null;
  readonly vehicleId: VehicleId;
  readonly driverId: StaffId;
  readonly movingSeconds: number;
  readonly idleSeconds: number;
  readonly distanceTraveledM: number;
}

export class VehicleLifecycleCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus
  ) {
    events.subscribe((event) => this.handleEvent(event));
  }

  private handleEvent(event: DomainEventEnvelope): void {
    if (
      event.type !== "trip.operatingInterval" &&
      event.type !== "vehicle.operatingInterval"
    ) return;

    this.applyOperatingInterval(
      event,
      event.payload as OperatingIntervalPayload
    );
  }

  private applyOperatingInterval(
    event: DomainEventEnvelope,
    payload: OperatingIntervalPayload
  ): void {
    const vehicle = this.repositories.vehicles.getById(payload.vehicleId);
    if (
      !vehicle ||
      (vehicle.status !== "running" &&
        vehicle.status !== "repositioning")
    ) return;

    const model = this.repositories.vehicleModels.getById(vehicle.modelId);
    if (!model) return;

    const runtime = this.repositories.vehicleRuntime.get();

    const drivingEnergy = runtime.consumeFraction(
      vehicle.id,
      "energy.drive",
      model.drivingEnergyUnitsPer100Km * payload.distanceTraveledM,
      100_000
    );
    const idleEnergy = runtime.consumeFraction(
      vehicle.id,
      "energy.idle",
      model.idleEnergyUnitsPerHour * payload.idleSeconds,
      3_600
    );
    const requestedEnergy = drivingEnergy + idleEnergy;
    const consumedEnergy = Math.min(
      vehicle.energyUnits,
      requestedEnergy
    );

    const powertrainWear = runtime.consumeFraction(
      vehicle.id,
      "wear.powertrain",
      model.powertrainWearPermillePer1000Km *
        payload.distanceTraveledM,
      1_000_000
    );
    const brakeWear = runtime.consumeFraction(
      vehicle.id,
      "wear.brake",
      model.brakeWearPermillePer1000Km *
        payload.distanceTraveledM,
      1_000_000
    );
    const tireWear = runtime.consumeFraction(
      vehicle.id,
      "wear.tire",
      model.tireWearPermillePer1000Km *
        payload.distanceTraveledM,
      1_000_000
    );

    const powertrain = Math.max(
      0,
      Number(vehicle.powertrainConditionPermille) - powertrainWear
    );
    const brake = Math.max(
      0,
      Number(vehicle.brakeConditionPermille) - brakeWear
    );
    const tire = Math.max(
      0,
      Number(vehicle.tireConditionPermille) - tireWear
    );

    const incident = chooseIncident(
      requestedEnergy,
      vehicle.energyUnits,
      powertrain,
      brake,
      tire
    );

    const updated = {
      ...vehicle,
      mileageM: units.distanceM(
        Number(vehicle.mileageM) + payload.distanceTraveledM
      ),
      energyUnits: vehicle.energyUnits - consumedEnergy,
      powertrainConditionPermille: units.permille(powertrain),
      brakeConditionPermille: units.permille(brake),
      tireConditionPermille: units.permille(tire),
      status: incident ? ("broken" as const) : vehicle.status,
      activeIncident: incident
        ? {
            kind: incident,
            occurredAtGameSecond: event.gameSecond
          }
        : vehicle.activeIncident
    };

    this.repositories.vehicles.save(updated);
    this.repositories.vehicleRuntime.replace(runtime);

    if (consumedEnergy > 0) {
      this.events.publish(
        createSimulationDomainEvent(
          "vehicle.energyConsumed",
          "vehicle",
          vehicle.id,
          event.gameSecond,
          {
            vehicleId: vehicle.id,
            tripId: payload.tripId,
            energyKind: model.energyKind,
            energyUnits: consumedEnergy
          }
        )
      );
    }

    if (incident !== null) {
      this.events.publish(
        createSimulationDomainEvent(
          "vehicle.brokenDown",
          "vehicle",
          vehicle.id,
          event.gameSecond,
          {
            vehicleId: vehicle.id,
            tripId: payload.tripId,
            incident
          }
        )
      );
    }
  }
}

function chooseIncident(
  requestedEnergy: number,
  availableEnergy: number,
  powertrain: number,
  brake: number,
  tire: number
): VehicleIncidentKind | null {
  if (requestedEnergy > availableEnergy) return "energy_depleted";
  if (powertrain <= 0) return "powertrain_failure";
  if (brake <= 0) return "brake_failure";
  if (tire <= 0) return "tire_failure";
  return null;
}
