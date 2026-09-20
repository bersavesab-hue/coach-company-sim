import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { EconomicPolicy } from "../../simulation/finance/EconomicPolicy.js";
import type { VehicleLifecyclePolicy } from "../policies/VehicleLifecyclePolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { estimatePathSeconds } from "../services/FleetTaskTiming.js";
import { completeVehicleMaintenance } from "../../domain/vehicle/VehicleLifecycleRules.js";
import { recoverDisruptedTripToStop } from "../../domain/trip/TripRules.js";
import { units, type GameSecond } from "../../core/units/Units.js";

export class FleetOperationsCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    private readonly economicPolicy: EconomicPolicy,
    private readonly lifecyclePolicy: VehicleLifecyclePolicy
  ) {}

  advanceTo(targetGameSecond: GameSecond): void {
    for (const task of this.repositories.fleetTasks.findRunning()) {
      if (
        Number(task.completesAtGameSecond) >
        Number(targetGameSecond)
      ) continue;

      const vehicle = this.repositories.vehicles.getById(task.vehicleId);
      if (!vehicle) continue;

      const model = this.repositories.vehicleModels.getById(vehicle.modelId);
      if (!model) continue;

      if (task.kind === "deadhead") {
        const timing = estimatePathSeconds(
          task.pathLegs,
          model,
          this.repositories.world.get()
        );

        if (task.driverId !== null && timing.seconds > 0) {
          this.events.publish(
            createSimulationDomainEvent(
              "vehicle.operatingInterval",
              "vehicle",
              vehicle.id,
              task.completesAtGameSecond,
              {
                tripId: null,
                vehicleId: vehicle.id,
                driverId: task.driverId,
                movingSeconds: timing.seconds,
                idleSeconds: 0,
                distanceTraveledM: timing.distanceM,
                roadUsage: timing.roadUsage
              }
            )
          );
        }

        const afterOperation =
          this.repositories.vehicles.getById(vehicle.id) ?? vehicle;

        this.repositories.vehicles.save({
          ...afterOperation,
          status:
            afterOperation.status === "broken" ? "broken" : "available",
          currentStationId: task.toStationId,
          availableAtGameSecond: task.completesAtGameSecond,
          activeFleetTaskId: null
        });

        if (task.driverId !== null) {
          const driver = this.repositories.staff.getDriverById(task.driverId);
          if (driver) {
            this.repositories.staff.saveDriver({
              ...driver,
              status: "available",
              currentStationId: task.toStationId,
              availableAtGameSecond: task.completesAtGameSecond,
              activeFleetTaskId: null,
              lastDutyEndedAtGameSecond: task.completesAtGameSecond,
              continuousDrivingSeconds:
                driver.continuousDrivingSeconds + timing.seconds
            });
          }
        }
      }

      if (task.kind === "refuel") {
        const cost = task.quotedCostCents ?? units.moneyCents(0);
        const capacity = Math.max(
          0,
          model.energyCapacityUnits - vehicle.energyUnits
        );
        const added = Math.min(task.energyUnits, capacity);

        this.repositories.vehicles.save({
          ...vehicle,
          energyUnits: vehicle.energyUnits + added,
          status: "available",
          availableAtGameSecond: task.completesAtGameSecond,
          activeFleetTaskId: null,
          activeIncident:
            vehicle.activeIncident?.kind === "energy_depleted"
              ? null
              : vehicle.activeIncident
        });

        if (added > 0) {
          this.events.publish(
            createSimulationDomainEvent(
              "vehicle.energyPurchased",
              "vehicle",
              vehicle.id,
              task.completesAtGameSecond,
              {
                vehicleId: vehicle.id,
                companyId: vehicle.companyId,
                energyKind: model.energyKind,
                energyUnits: added,
                totalCostCents: cost
              }
            )
          );
        }
      }

      if (task.kind === "maintenance") {
        const maintained = completeVehicleMaintenance(vehicle, model);
        this.repositories.vehicles.save({
          ...maintained,
          currentStationId: vehicle.currentStationId,
          availableAtGameSecond: task.completesAtGameSecond,
          activeFleetTaskId: null
        });

        this.events.publish(
          createSimulationDomainEvent(
            "vehicle.maintenanceCompleted",
            "vehicle",
            vehicle.id,
            task.completesAtGameSecond,
            {
              vehicleId: vehicle.id,
              companyId: vehicle.companyId,
              costCents:
                task.quotedCostCents ??
                this.lifecyclePolicy.quoteMaintenance(
                  vehicle,
                  model,
                  task.completesAtGameSecond
                )
            }
          )
        );
      }

      if (task.kind === "recovery" && task.tripId !== null) {
        const trip = this.repositories.trips.getById(task.tripId);
        const route = trip
          ? this.repositories.routes.getById(trip.routeId)
          : undefined;

        if (trip && route && task.toStationId !== null) {
          const recovered = recoverDisruptedTripToStop(
            trip,
            route,
            task.toStationId,
            task.completesAtGameSecond
          );
          if (recovered.ok) {
            this.repositories.trips.save(recovered.value);
          }
        }

        this.repositories.vehicles.save({
          ...vehicle,
          status: "broken",
          currentStationId: task.toStationId,
          availableAtGameSecond: task.completesAtGameSecond,
          activeTripId: null,
          activeFleetTaskId: null
        });

        if (task.driverId !== null) {
          const driver = this.repositories.staff.getDriverById(task.driverId);
          if (driver) {
            this.repositories.staff.saveDriver({
              ...driver,
              status: "available",
              currentStationId: task.toStationId,
              availableAtGameSecond: task.completesAtGameSecond,
              activeTripId: null,
              activeFleetTaskId: null,
              lastDutyEndedAtGameSecond: task.completesAtGameSecond
            });
          }
        }
      }

      this.repositories.fleetTasks.save({
        ...task,
        status: "completed",
        completedAtGameSecond: task.completesAtGameSecond
      });

      this.events.publish(
        createSimulationDomainEvent(
          "fleet.taskCompleted",
          "vehicle",
          vehicle.id,
          task.completesAtGameSecond,
          { taskId: task.id, kind: task.kind }
        )
      );
    }
  }
}
