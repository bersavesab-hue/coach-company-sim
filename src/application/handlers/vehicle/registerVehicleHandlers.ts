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
import type { OwnedVehicle } from "../../../domain/vehicle/OwnedVehicle.js";
import { completeVehicleMaintenance } from "../../../domain/vehicle/VehicleLifecycleRules.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  PurchaseVehicleEnergyPayload,
  PurchaseVehiclePayload,
  VehicleByIdPayload
} from "../../commands/vehicle/VehicleCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { VehicleLifecyclePolicy } from "../../policies/VehicleLifecyclePolicy.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type { EconomicPolicy } from "../../../simulation/finance/EconomicPolicy.js";

export interface VehicleHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
  readonly lifecyclePolicy: VehicleLifecyclePolicy;
  readonly economicPolicy: EconomicPolicy;
}

export function registerVehicleHandlers(
  commands: CommandBus,
  dependencies: VehicleHandlerDependencies
): void {
  commands.register("vehicle.purchase", (command) =>
    handlePurchase(command, dependencies)
  );
  commands.register("vehicle.refuel", (command) =>
    handleEnergyPurchase(command, dependencies)
  );
  commands.register("vehicle.sendToMaintenance", (command) =>
    handleSendToMaintenance(command, dependencies)
  );
  commands.register("vehicle.completeMaintenance", (command) =>
    handleCompleteMaintenance(command, dependencies)
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

function handlePurchase(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as PurchaseVehiclePayload;
  const company = dependencies.repositories.companies.getById(
    payload.companyId
  );

  if (!company || company.status !== "active") {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle purchase requires an active company",
        { companyId: payload.companyId }
      )
    );
  }

  const actor = requireActor(command, company.id);
  if (!actor.ok) return actor;

  const model = dependencies.repositories.vehicleModels.getById(
    payload.vehicleModelId
  );
  if (!model || !model.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle model is not available for purchase",
        { vehicleModelId: payload.vehicleModelId }
      )
    );
  }

  if (payload.depotStationId !== null) {
    const depot = dependencies.repositories.stations.getById(
      payload.depotStationId
    );
    if (!depot || depot.status !== "active") {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle depot station is missing or inactive",
          { stationId: payload.depotStationId }
        )
      );
    }
  }

  const terms = dependencies.lifecyclePolicy.quotePurchase(
    company.id,
    model.id,
    command.issuedAtGameSecond
  );

  const funds = requireCash(
    dependencies.repositories,
    company.id,
    terms.purchasePriceCents
  );
  if (!funds.ok) return funds;

  const vehicle: OwnedVehicle = {
    id: dependencies.ids.nextVehicleId(),
    companyId: company.id,
    modelId: model.id,
    mileageM: units.distanceM(0),
    energyUnits: 0,
    powertrainConditionPermille: units.permille(1000),
    brakeConditionPermille: units.permille(1000),
    tireConditionPermille: units.permille(1000),
    bodyConditionPermille: units.permille(1000),
    lastMaintenanceMileageM: units.distanceM(0),
    nextMaintenanceMileageM: units.distanceM(model.serviceIntervalM),
    registeredAtGameSecond: command.issuedAtGameSecond,
    insuranceValidUntilGameSecond: addDays(
      command.issuedAtGameSecond,
      terms.initialInsuranceValidDays
    ),
    inspectionValidUntilGameSecond: addDays(
      command.issuedAtGameSecond,
      terms.initialInspectionValidDays
    ),
    status: "available",
    activeIncident: null,
    depotStationId: payload.depotStationId,
    activeTripId: null
  };

  dependencies.repositories.vehicles.save(vehicle);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.purchased",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: company.id,
        vehicleModelId: model.id,
        purchasePriceCents: terms.purchasePriceCents,
        residualValueCents: terms.residualValueCents,
        usefulLifeDays: terms.usefulLifeDays,
        dailyInsuranceCents: terms.dailyInsuranceCents,
        dailyVehicleTaxCents: terms.dailyVehicleTaxCents
      }
    )
  );

  return ok(vehicle);
}

function handleEnergyPurchase(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
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
  if (
    vehicle.status === "running" ||
    vehicle.status === "maintenance" ||
    vehicle.status === "sold" ||
    vehicle.status === "retired"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle cannot receive energy in its current state",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  const availableCapacity = model.energyCapacityUnits - vehicle.energyUnits;
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

  const newEnergyUnits = vehicle.energyUnits + purchasedUnits;
  const energyRecovery =
    vehicle.status === "broken" &&
    vehicle.activeTripId === null &&
    vehicle.activeIncident?.kind === "energy_depleted" &&
    newEnergyUnits >= model.minimumDispatchEnergyUnits;

  const updated: OwnedVehicle = {
    ...vehicle,
    energyUnits: newEnergyUnits,
    status: energyRecovery ? "available" : vehicle.status,
    activeIncident: energyRecovery ? null : vehicle.activeIncident
  };

  dependencies.repositories.vehicles.save(updated);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.energyPurchased",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
        energyKind: model.energyKind,
        energyUnits: purchasedUnits,
        totalCostCents: costCents
      }
    )
  );

  return ok(updated);
}

function handleSendToMaintenance(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;

  const { vehicle } = context.value;
  if (
    vehicle.activeTripId !== null ||
    (vehicle.status !== "available" && vehicle.status !== "broken")
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle must be off-trip before entering maintenance",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  const updated: OwnedVehicle = {
    ...vehicle,
    status: "maintenance"
  };
  dependencies.repositories.vehicles.save(updated);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.maintenanceStarted",
      "vehicle",
      vehicle.id,
      { vehicleId: vehicle.id }
    )
  );
  return ok(updated);
}

function handleCompleteMaintenance(
  command: CommandEnvelope,
  dependencies: VehicleHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as VehicleByIdPayload;
  const context = requireVehicle(payload.vehicleId, command, dependencies);
  if (!context.ok) return context;

  const { vehicle, model } = context.value;
  if (vehicle.status !== "maintenance" || vehicle.activeTripId !== null) {
    return err(
      new DomainError(
        "VEHICLE_IN_MAINTENANCE",
        "Vehicle must be in maintenance with no active trip",
        { vehicleId: vehicle.id }
      )
    );
  }

  const costCents = dependencies.lifecyclePolicy.quoteMaintenance(
    vehicle,
    model,
    command.issuedAtGameSecond
  );
  const updated = completeVehicleMaintenance(vehicle, model);

  dependencies.repositories.vehicles.save(updated);
  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicle.maintenanceCompleted",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
        costCents
      }
    )
  );

  return ok(updated);
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
        validUntilGameSecond:
          updated.insuranceValidUntilGameSecond
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
        validUntilGameSecond:
          updated.inspectionValidUntilGameSecond
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
  if (
    vehicle.activeTripId !== null ||
    vehicle.status === "running" ||
    vehicle.status === "assigned" ||
    vehicle.status === "maintenance"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle cannot be disposed while assigned, running or in maintenance",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  if (vehicle.status === "sold" || vehicle.status === "retired") {
    return err(
      new DomainError(
        "VEHICLE_ALREADY_DISPOSED",
        "Vehicle was already disposed",
        { vehicleId: vehicle.id }
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
        {
          companyId,
          actorCompanyId: command.actorCompanyId
        }
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
    vehicle.status === "running" ||
    vehicle.status === "assigned" ||
    vehicle.status === "sold" ||
    vehicle.status === "retired"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle must be stationary and owned for this operation",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  return ok(true);
}
