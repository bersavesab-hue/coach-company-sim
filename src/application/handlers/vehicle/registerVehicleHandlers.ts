import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type {
  CompanyId,
  VehicleId
} from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../../core/result/Result.js";
import { SECONDS_PER_DAY } from "../../../core/time/GameTime.js";
import {
  units,
  type MoneyCents
} from "../../../core/units/Units.js";
import { accountBalanceCents } from "../../../domain/finance/LedgerMath.js";
import type { FleetTask } from "../../../domain/operations/FleetTask.js";
import type { OwnedVehicle } from "../../../domain/vehicle/OwnedVehicle.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  PurchaseVehicleEnergyPayload,
  VehicleByIdPayload
} from "../../commands/vehicle/VehicleCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { OperationsPolicy } from "../../policies/OperationsPolicy.js";
import type { VehicleLifecyclePolicy } from "../../policies/VehicleLifecyclePolicy.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type { EconomicPolicy } from "../../../simulation/finance/EconomicPolicy.js";

export interface VehicleHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
  readonly lifecyclePolicy: VehicleLifecyclePolicy;
  readonly economicPolicy: EconomicPolicy;
  readonly operationsPolicy: OperationsPolicy;
}

export function registerVehicleHandlers(
  commands: CommandBus,
  dependencies: VehicleHandlerDependencies
): void {
  commands.register("vehicle.refuel", (command) =>
    handleEnergyPurchase(command, dependencies)
  );
  commands.register("vehicle.sendToMaintenance", (command) =>
    handleSendToMaintenance(command, dependencies)
  );
  commands.register("vehicle.renewInsurance", (command) =>
    handleRenewInsurance(command, dependencies)
  );
  commands.register("vehicle.passInspection", (command) =>
    handleInspection(command, dependencies)
  );
  commands.register("vehicle.sell", (command) =>
    handleSell(command, dependencies)
  );
  commands.register("vehicle.retire", (command) =>
    handleRetire(command, dependencies)
  );
}

function handleEnergyPurchase(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<FleetTask, DomainError> {
  const payload = command.payload as PurchaseVehicleEnergyPayload;
  if (!Number.isSafeInteger(payload.energyUnits) || payload.energyUnits <= 0) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Energy purchase units must be a positive integer"
      )
    );
  }

  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;
  const { vehicle, model } = context.value;

  const idle = requireStationaryTaskVehicle(vehicle, command);
  if (!idle.ok) return idle;

  const availableCapacity =
    vehicle.energyCapacityUnits - vehicle.energyUnits;
  const purchasedUnits = Math.min(
    payload.energyUnits,
    Math.max(0, availableCapacity)
  );
  if (purchasedUnits <= 0) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Vehicle energy storage is already full",
        { vehicleId: vehicle.id }
      )
    );
  }

  const priceMilliCents =
    dependencies.economicPolicy.energyPriceMilliCentsPerUnit(
      model.energyKind,
      command.issuedAtGameSecond
    );
  const costCents = units.moneyCents(
    Math.ceil((priceMilliCents * purchasedUnits) / 1000)
  );
  const funds = requireCash(
    dependencies.repositories,
    vehicle.companyId,
    costCents
  );
  if (!funds.ok) return funds;

  const seconds = dependencies.operationsPolicy.refuelServiceSeconds(
    model.energyKind,
    purchasedUnits
  );
  const end = units.gameSecond(
    Number(command.issuedAtGameSecond) + seconds
  );
  const conflict = ensureVehicleTaskWindow(
    dependencies.repositories,
    vehicle.id,
    end
  );
  if (!conflict.ok) return conflict;

  const task: FleetTask = {
    id: dependencies.ids.nextFleetTaskId(),
    companyId: vehicle.companyId,
    kind: "refuel",
    status: "running",
    vehicleId: vehicle.id,
    driverId: null,
    tripId: null,
    fromStationId: vehicle.currentStationId,
    toStationId: vehicle.currentStationId,
    pathLegs: [],
    startedAtGameSecond: command.issuedAtGameSecond,
    completesAtGameSecond: end,
    completedAtGameSecond: null,
    energyUnits: purchasedUnits,
    quotedCostCents: costCents
  };

  dependencies.repositories.fleetTasks.save(task);
  dependencies.repositories.vehicles.save({
    ...vehicle,
    status: "refueling",
    availableAtGameSecond: end,
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

function handleSendToMaintenance(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<FleetTask, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;
  const { vehicle, model } = context.value;

  const idle = requireStationaryTaskVehicle(vehicle, command);
  if (!idle.ok) return idle;

  const costCents = dependencies.lifecyclePolicy.quoteMaintenance(
    vehicle,
    model,
    command.issuedAtGameSecond
  );
  const seconds = dependencies.operationsPolicy.maintenanceServiceSeconds(
    vehicle.id
  );
  const end = units.gameSecond(
    Number(command.issuedAtGameSecond) + seconds
  );
  const conflict = ensureVehicleTaskWindow(
    dependencies.repositories,
    vehicle.id,
    end
  );
  if (!conflict.ok) return conflict;

  const task: FleetTask = {
    id: dependencies.ids.nextFleetTaskId(),
    companyId: vehicle.companyId,
    kind: "maintenance",
    status: "running",
    vehicleId: vehicle.id,
    driverId: null,
    tripId: null,
    fromStationId: vehicle.currentStationId,
    toStationId: vehicle.currentStationId,
    pathLegs: [],
    startedAtGameSecond: command.issuedAtGameSecond,
    completesAtGameSecond: end,
    completedAtGameSecond: null,
    energyUnits: 0,
    quotedCostCents: costCents
  };

  dependencies.repositories.fleetTasks.save(task);
  dependencies.repositories.vehicles.save({
    ...vehicle,
    status: "maintenance",
    availableAtGameSecond: end,
    activeFleetTaskId: task.id
  });
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.maintenanceStarted",
      "vehicle",
      vehicle.id,
      { vehicleId: vehicle.id, taskId: task.id }
    )
  );
  dependencies.events.publish(
    createDomainEvent(
      command,
      "fleet.taskStarted",
      "vehicle",
      vehicle.id,
      { taskId: task.id, kind: task.kind },
      2
    )
  );

  return ok(task);
}

function handleRenewInsurance(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;
  const { vehicle } = context.value;

  const stationary = ensureStationary(vehicle);
  if (!stationary.ok) return stationary;

  const quote = dependencies.lifecyclePolicy.quoteInsuranceRenewal(
    vehicle,
    command.issuedAtGameSecond
  );
  const base = Math.max(
    Number(vehicle.insuranceValidUntilGameSecond),
    Number(command.issuedAtGameSecond)
  );
  const updated: OwnedVehicle = {
    ...vehicle,
    insuranceValidUntilGameSecond: units.gameSecond(
      base + quote.validForDays * SECONDS_PER_DAY
    )
  };

  dependencies.repositories.vehicles.save(updated);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.insuranceRenewed",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
        costCents: quote.costCents,
        validUntilGameSecond: updated.insuranceValidUntilGameSecond
      }
    )
  );
  return ok(updated);
}

function handleInspection(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;
  const { vehicle, model } = context.value;

  const stationary = ensureStationary(vehicle);
  if (!stationary.ok) return stationary;

  if (
    Number(vehicle.powertrainConditionPermille) <
      model.minimumPowertrainConditionPermille ||
    Number(vehicle.brakeConditionPermille) <
      model.minimumBrakeConditionPermille ||
    Number(vehicle.tireConditionPermille) <
      model.minimumTireConditionPermille
  ) {
    return err(
      new DomainError(
        "VEHICLE_UNSAFE",
        "Vehicle cannot pass inspection below technical limits",
        { vehicleId: vehicle.id }
      )
    );
  }

  const quote = dependencies.lifecyclePolicy.quoteInspection(
    vehicle,
    command.issuedAtGameSecond
  );
  const base = Math.max(
    Number(vehicle.inspectionValidUntilGameSecond),
    Number(command.issuedAtGameSecond)
  );
  const updated: OwnedVehicle = {
    ...vehicle,
    inspectionValidUntilGameSecond: units.gameSecond(
      base + quote.validForDays * SECONDS_PER_DAY
    )
  };

  dependencies.repositories.vehicles.save(updated);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.inspectionPassed",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
        costCents: quote.costCents,
        validUntilGameSecond: updated.inspectionValidUntilGameSecond
      }
    )
  );
  return ok(updated);
}

function handleSell(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  return disposeVehicle(command, dependencies, false);
}

function handleRetire(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  return disposeVehicle(command, dependencies, true);
}

function disposeVehicle(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies,
  retired: boolean
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;
  const { vehicle, model } = context.value;

  const stationary = ensureStationary(vehicle);
  if (!stationary.ok) return stationary;

  const futureTrips = dependencies.repositories.trips
    .findByVehicle(vehicle.id)
    .filter(
      (trip) =>
        trip.status !== "completed" &&
        trip.status !== "cancelled"
    );
  if (futureTrips.length > 0) {
    return err(
      new DomainError(
        "FLEET_TASK_CONFLICT",
        "Vehicle cannot be disposed while future trips still reserve it",
        { vehicleId: vehicle.id, tripIds: futureTrips.map((t) => t.id) }
      )
    );
  }

  const proceeds = retired
    ? dependencies.lifecyclePolicy.quoteScrap(
        vehicle,
        model,
        command.issuedAtGameSecond
      )
    : dependencies.lifecyclePolicy.quoteResale(
        vehicle,
        model,
        command.issuedAtGameSecond
      );

  const updated: OwnedVehicle = {
    ...vehicle,
    status: retired ? "retired" : "sold",
    activeIncident: null
  };
  dependencies.repositories.vehicles.save(updated);

  dependencies.events.publish(
    createDomainEvent(
      command,
      retired ? "vehicle.retired" : "vehicle.sold",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
        proceedsCents: proceeds
      }
    )
  );
  return ok(updated);
}

function requireVehicle(
  vehicleId: VehicleId,
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<
  {
    readonly vehicle: OwnedVehicle;
    readonly model: NonNullable<
      ReturnType<RepositoryBundle["vehicleModels"]["getById"]>
    >;
  },
  DomainError
> {
  const vehicle = dependencies.repositories.vehicles.getById(vehicleId);
  if (!vehicle) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Vehicle does not exist",
        { vehicleId }
      )
    );
  }

  const actor = requireActor(command, vehicle.companyId);
  if (!actor.ok) return actor;

  const model = dependencies.repositories.vehicleModels.getById(
    vehicle.modelId
  );
  if (!model) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Vehicle model does not exist",
        { vehicleId, vehicleModelId: vehicle.modelId }
      )
    );
  }

  return ok({ vehicle, model });
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
        "Command actor does not own this vehicle",
        { companyId, actorCompanyId: command.actorCompanyId }
      )
    );
  }
  return ok(true);
}

function requireCash(
  repositories: RepositoryBundle,
  companyId: CompanyId,
  required: MoneyCents
): Result<true, DomainError> {
  const cash = accountBalanceCents(
    repositories.finance.ledgerEntriesByCompany(companyId),
    "cash"
  );
  if (cash < Number(required)) {
    return err(
      new DomainError(
        "INSUFFICIENT_FUNDS",
        "Company does not have enough cash",
        {
          companyId,
          availableCashCents: cash,
          requiredCashCents: required
        }
      )
    );
  }
  return ok(true);
}

function addDays(
  gameSecond: CommandEnvelope["issuedAtGameSecond"],
  days: number
) {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error("Vehicle document validity days must be positive");
  }
  return units.gameSecond(
    Number(gameSecond) + days * SECONDS_PER_DAY
  );
}

function ensureStationary(
  vehicle: OwnedVehicle
): Result<true, DomainError> {
  if (
    vehicle.activeTripId !== null ||
    vehicle.activeFleetTaskId !== null ||
    vehicle.status === "running" ||
    vehicle.status === "assigned" ||
    vehicle.status === "repositioning" ||
    vehicle.status === "refueling" ||
    vehicle.status === "maintenance" ||
    vehicle.status === "recovering" ||
    vehicle.status === "sold" ||
    vehicle.status === "retired"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle must be stationary and not executing another operation",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }
  return ok(true);
}

function requireStationaryTaskVehicle(
  vehicle: OwnedVehicle,
  command: CommandEnvelope
): Result<true, DomainError> {
  const stationary = ensureStationary(vehicle);
  if (!stationary.ok) return stationary;
  if (
    vehicle.currentStationId === null ||
    Number(vehicle.availableAtGameSecond) > Number(command.issuedAtGameSecond)
  ) {
    return err(
      new DomainError(
        "RESOURCE_LOCATION_MISMATCH",
        "Vehicle is not at an available station for this operation",
        {
          vehicleId: vehicle.id,
          currentStationId: vehicle.currentStationId,
          availableAtGameSecond: vehicle.availableAtGameSecond
        }
      )
    );
  }
  return ok(true);
}

function ensureVehicleTaskWindow(
  repositories: RepositoryBundle,
  vehicleId: VehicleId,
  end: ReturnType<typeof units.gameSecond>
): Result<true, DomainError> {
  const conflict = repositories.trips
    .findByVehicle(vehicleId)
    .find(
      (trip) =>
        trip.status !== "completed" &&
        trip.status !== "cancelled" &&
        Number(trip.plannedDepartureGameSecond) < Number(end)
    );
  if (conflict) {
    return err(
      new DomainError(
        "FLEET_TASK_CONFLICT",
        "Vehicle operation would overlap an upcoming trip",
        { vehicleId, tripId: conflict.id }
      )
    );
  }
  return ok(true);
}
