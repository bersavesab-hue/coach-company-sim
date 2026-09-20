import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type {
  CompanyId,
  StaffId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../../core/result/Result.js";
import { units } from "../../../core/units/Units.js";
import type { FleetTask } from "../../../domain/operations/FleetTask.js";
import { findPath } from "../../../domain/world/PathFinder.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  RecoverFleetPayload,
  RepositionFleetPayload
} from "../../commands/fleet/FleetCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { OperationsPolicy } from "../../policies/OperationsPolicy.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import { estimatePathSeconds } from "../../services/FleetTaskTiming.js";

export interface FleetHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
  readonly operationsPolicy: OperationsPolicy;
}

export function registerFleetHandlers(
  commands: CommandBus,
  dependencies: FleetHandlerDependencies
): void {
  commands.register("fleet.reposition", (command) =>
    handleReposition(command, dependencies)
  );
  commands.register("fleet.recover", (command) =>
    handleRecover(command, dependencies)
  );
}

function handleReposition(
  command: CommandEnvelope,
  dependencies: FleetHandlerDependencies
): Result<FleetTask, DomainError> {
  const payload = command.payload as RepositionFleetPayload;
  const vehicle = dependencies.repositories.vehicles.getById(
    payload.vehicleId
  );
  const driver = dependencies.repositories.staff.getDriverById(
    payload.driverId
  );

  if (!vehicle || !driver) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Reposition vehicle or driver is missing",
        { vehicleId: payload.vehicleId, driverId: payload.driverId }
      )
    );
  }

  const actor = requireActor(command, vehicle.companyId);
  if (!actor.ok) return actor;

  if (driver.companyId !== vehicle.companyId) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Driver belongs to another company",
        { driverId: driver.id }
      )
    );
  }

  if (
    vehicle.status !== "available" ||
    driver.status !== "available" ||
    vehicle.activeTripId !== null ||
    driver.activeTripId !== null ||
    vehicle.activeFleetTaskId !== null ||
    driver.activeFleetTaskId !== null
  ) {
    return err(
      new DomainError(
        "FLEET_TASK_CONFLICT",
        "Vehicle and driver must both be idle before repositioning",
        { vehicleId: vehicle.id, driverId: driver.id }
      )
    );
  }

  if (
    vehicle.currentStationId === null ||
    driver.currentStationId !== vehicle.currentStationId ||
    Number(vehicle.availableAtGameSecond) > Number(command.issuedAtGameSecond) ||
    Number(driver.availableAtGameSecond) > Number(command.issuedAtGameSecond)
  ) {
    return err(
      new DomainError(
        "RESOURCE_LOCATION_MISMATCH",
        "Vehicle and driver must be together at an available station",
        {
          vehicleStationId: vehicle.currentStationId,
          driverStationId: driver.currentStationId
        }
      )
    );
  }

  const fromStation = dependencies.repositories.stations.getById(
    vehicle.currentStationId
  );
  const toStation = dependencies.repositories.stations.getById(
    payload.toStationId
  );
  if (!fromStation || !toStation || toStation.status !== "active") {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Reposition station is missing or inactive"
      )
    );
  }

  const path = findPath(
    dependencies.repositories.world.get(),
    dependencies.repositories.worldRuntime.get(),
    fromStation.worldNodeId,
    toStation.worldNodeId,
    "fastest_time"
  );
  if (!path.ok) return path;

  const model = dependencies.repositories.vehicleModels.getById(
    vehicle.modelId
  );
  if (!model) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Vehicle model is missing",
        { vehicleModelId: vehicle.modelId }
      )
    );
  }

  const timing = estimatePathSeconds(
    path.value.legs,
    model,
    dependencies.repositories.world.get()
  );

  const requiredEnergy =
    Math.ceil(
      (model.drivingEnergyUnitsPer100Km * timing.distanceM) / 100_000
    ) + model.minimumDispatchEnergyUnits;
  if (vehicle.energyUnits < requiredEnergy) {
    return err(
      new DomainError(
        "VEHICLE_ENERGY_INSUFFICIENT",
        "Vehicle lacks energy for repositioning plus dispatch reserve",
        {
          vehicleId: vehicle.id,
          availableEnergyUnits: vehicle.energyUnits,
          requiredEnergyUnits: requiredEnergy
        }
      )
    );
  }

  const projectedPowertrainWear = Math.ceil(
    (model.powertrainWearPermillePer1000Km * timing.distanceM) /
      1_000_000
  );
  const projectedBrakeWear = Math.ceil(
    (model.brakeWearPermillePer1000Km * timing.distanceM) /
      1_000_000
  );
  const projectedTireWear = Math.ceil(
    (model.tireWearPermillePer1000Km * timing.distanceM) /
      1_000_000
  );

  if (
    Number(vehicle.powertrainConditionPermille) -
        projectedPowertrainWear <
      model.minimumPowertrainConditionPermille ||
    Number(vehicle.brakeConditionPermille) - projectedBrakeWear <
      model.minimumBrakeConditionPermille ||
    Number(vehicle.tireConditionPermille) - projectedTireWear <
      model.minimumTireConditionPermille
  ) {
    return err(
      new DomainError(
        "VEHICLE_UNSAFE",
        "Vehicle condition would fall below dispatch standard during repositioning",
        { vehicleId: vehicle.id }
      )
    );
  }

  const minimumRest =
    dependencies.operationsPolicy.minimumDriverRestSeconds(driver.id);
  const rested =
    driver.lastDutyEndedAtGameSecond === null ||
    Number(command.issuedAtGameSecond) -
        Number(driver.lastDutyEndedAtGameSecond) >=
      minimumRest;
  const continuousDriving = rested
    ? 0
    : driver.continuousDrivingSeconds;
  const dutyStart =
    rested || driver.dutyStartedAtGameSecond === null
      ? Number(command.issuedAtGameSecond)
      : Number(driver.dutyStartedAtGameSecond);

  if (
    continuousDriving + timing.seconds >
    dependencies.operationsPolicy.maximumContinuousDrivingSeconds(driver.id)
  ) {
    return err(
      new DomainError(
        "DRIVER_REST_REQUIRED",
        "Driver must rest before this repositioning task",
        {
          driverId: driver.id,
          continuousDrivingSeconds: continuousDriving,
          repositionDrivingSeconds: timing.seconds
        }
      )
    );
  }

  const end = units.gameSecond(
    Number(command.issuedAtGameSecond) + timing.seconds
  );

  if (
    Number(end) - dutyStart >
    dependencies.operationsPolicy.maximumDutySeconds(driver.id)
  ) {
    return err(
      new DomainError(
        "DRIVER_DUTY_LIMIT",
        "Driver duty-time limit would be exceeded by repositioning",
        { driverId: driver.id }
      )
    );
  }

  const reservation = ensureNoUpcomingReservation(
    dependencies.repositories,
    vehicle.id,
    driver.id,
    end
  );
  if (!reservation.ok) return reservation;

  const task: FleetTask = {
    id: dependencies.ids.nextFleetTaskId(),
    companyId: vehicle.companyId,
    kind: "deadhead",
    status: "running",
    vehicleId: vehicle.id,
    driverId: driver.id,
    tripId: null,
    fromStationId: fromStation.id,
    toStationId: toStation.id,
    pathLegs: path.value.legs,
    startedAtGameSecond: command.issuedAtGameSecond,
    completesAtGameSecond: end,
    completedAtGameSecond: null,
    energyUnits: 0,
    quotedCostCents: null
  };

  dependencies.repositories.fleetTasks.save(task);
  dependencies.repositories.vehicles.save({
    ...vehicle,
    status: "repositioning",
    currentStationId: null,
    availableAtGameSecond: end,
    activeFleetTaskId: task.id
  });
  dependencies.repositories.staff.saveDriver({
    ...driver,
    status: "repositioning",
    currentStationId: null,
    availableAtGameSecond: end,
    dutyStartedAtGameSecond:
      rested || driver.dutyStartedAtGameSecond === null
        ? command.issuedAtGameSecond
        : driver.dutyStartedAtGameSecond,
    continuousDrivingSeconds: rested
      ? 0
      : driver.continuousDrivingSeconds,
    activeFleetTaskId: task.id
  });

  dependencies.events.publish(
    createDomainEvent(
      command,
      "fleet.taskStarted",
      "vehicle",
      vehicle.id,
      { taskId: task.id, kind: task.kind }
    )
  );

  return ok(task);
}

function handleRecover(
  command: CommandEnvelope,
  dependencies: FleetHandlerDependencies
): Result<FleetTask, DomainError> {
  const payload = command.payload as RecoverFleetPayload;
  const trip = dependencies.repositories.trips.getById(payload.tripId);

  if (!trip || trip.status !== "disrupted" || trip.vehicleId === null) {
    return err(
      new DomainError(
        "TRIP_NOT_DISRUPTED",
        "Recovery requires a disrupted trip with its failed vehicle",
        { tripId: payload.tripId }
      )
    );
  }

  const route = dependencies.repositories.routes.getById(trip.routeId);
  const stop = route?.stopPoints.find(
    (item) => item.stationId === payload.recoveryStationId
  );
  if (!route || !stop) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Recovery station must be a stop on the disrupted route",
        { recoveryStationId: payload.recoveryStationId }
      )
    );
  }

  const vehicle = dependencies.repositories.vehicles.getById(trip.vehicleId);
  if (!vehicle || vehicle.status !== "broken" || !vehicle.activeIncident) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Disrupted trip vehicle is not in a recoverable broken state"
      )
    );
  }

  const actor = requireActor(command, vehicle.companyId);
  if (!actor.ok) return actor;

  const seconds = dependencies.operationsPolicy.recoveryServiceSeconds(
    vehicle.id,
    vehicle.activeIncident.kind
  );
  const end = units.gameSecond(
    Number(command.issuedAtGameSecond) + seconds
  );

  const task: FleetTask = {
    id: dependencies.ids.nextFleetTaskId(),
    companyId: vehicle.companyId,
    kind: "recovery",
    status: "running",
    vehicleId: vehicle.id,
    driverId: trip.driverId,
    tripId: trip.id,
    fromStationId: null,
    toStationId: payload.recoveryStationId,
    pathLegs: [],
    startedAtGameSecond: command.issuedAtGameSecond,
    completesAtGameSecond: end,
    completedAtGameSecond: null,
    energyUnits: 0,
    quotedCostCents: null
  };

  dependencies.repositories.fleetTasks.save(task);
  dependencies.repositories.vehicles.save({
    ...vehicle,
    status: "recovering",
    availableAtGameSecond: end,
    activeFleetTaskId: task.id
  });

  if (trip.driverId !== null) {
    const driver = dependencies.repositories.staff.getDriverById(
      trip.driverId
    );
    if (driver) {
      dependencies.repositories.staff.saveDriver({
        ...driver,
        status: "off_duty",
        availableAtGameSecond: end,
        activeFleetTaskId: task.id
      });
    }
  }

  dependencies.events.publish(
    createDomainEvent(
      command,
      "fleet.taskStarted",
      "vehicle",
      vehicle.id,
      { taskId: task.id, kind: task.kind, tripId: trip.id }
    )
  );

  return ok(task);
}

function ensureNoUpcomingReservation(
  repositories: RepositoryBundle,
  vehicleId: VehicleId,
  driverId: StaffId,
  taskEnd: ReturnType<typeof units.gameSecond>
): Result<true, DomainError> {
  const conflicts = [
    ...repositories.trips.findByVehicle(vehicleId),
    ...repositories.trips.findByDriver(driverId)
  ].filter(
    (trip) =>
      trip.status !== "completed" &&
      trip.status !== "cancelled" &&
      Number(trip.plannedDepartureGameSecond) < Number(taskEnd)
  );

  if (conflicts.length > 0) {
    return err(
      new DomainError(
        "FLEET_TASK_CONFLICT",
        "Fleet task would overlap an upcoming passenger trip",
        { tripIds: conflicts.map((trip) => trip.id) }
      )
    );
  }

  return ok(true);
}

function requireActor(
  command: CommandEnvelope,
  companyId: CompanyId
): Result<true, DomainError> {
  if (
    command.actorCompanyId !== undefined &&
    command.actorCompanyId !== companyId
  ) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Command actor does not own this fleet resource"
      )
    );
  }
  return ok(true);
}
