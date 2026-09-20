import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type VehicleConfigurationId
} from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../../core/result/Result.js";
import { SECONDS_PER_DAY } from "../../../core/time/GameTime.js";
import {
  units,
  type MoneyCents
} from "../../../core/units/Units.js";
import { accountBalanceCents } from "../../../domain/finance/LedgerMath.js";
import { createVehicleConfiguration } from "../../../domain/vehicle-market/VehicleConfigurationRules.js";
import type { VehicleConfiguration } from "../../../domain/vehicle-market/VehicleConfiguration.js";
import type { VehicleListing } from "../../../domain/vehicle-market/VehicleListing.js";
import type { OwnedVehicle } from "../../../domain/vehicle/OwnedVehicle.js";
import type { CommandBus } from "../../CommandBus.js";
import type {
  CreateVehicleConfigurationPayload,
  PurchaseVehicleListingPayload
} from "../../commands/vehicle-market/VehicleMarketCommands.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../../ids/RuntimeIdAllocator.js";
import type { VehicleLifecyclePolicy } from "../../policies/VehicleLifecyclePolicy.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";

export interface VehicleMarketHandlerDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
  readonly lifecyclePolicy: VehicleLifecyclePolicy;
}

export function registerVehicleMarketHandlers(
  commands: CommandBus,
  dependencies: VehicleMarketHandlerDependencies
): void {
  commands.register("vehicleMarket.createConfiguration", (command) =>
    handleCreateConfiguration(command, dependencies)
  );
  commands.register("vehicleMarket.purchaseListing", (command) =>
    handlePurchaseListing(command, dependencies)
  );
}

function handleCreateConfiguration(
  command: CommandEnvelope,
  dependencies: VehicleMarketHandlerDependencies
): Result<VehicleConfiguration, DomainError> {
  const payload = command.payload as CreateVehicleConfigurationPayload;
  const variant = dependencies.repositories.vehicleMarket.getVariant(
    payload.variantId
  );
  if (!variant) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Vehicle variant does not exist",
        { variantId: payload.variantId }
      )
    );
  }

  const options = [];
  for (const code of payload.selectedOptionCodes) {
    const option = dependencies.repositories.vehicleMarket.getOption(code);
    if (!option) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle option does not exist",
          { optionCode: code }
        )
      );
    }
    options.push(option);
  }

  const created = createVehicleConfiguration({
    id: configurationIdFromCommand(command),
    variant,
    createdByCompanyId: command.actorCompanyId ?? null,
    customName:
      payload.customName === null
        ? null
        : normalizeOptionalText(payload.customName),
    selectedOptions: options,
    exteriorColorCode:
      payload.exteriorColorCode === null
        ? null
        : normalizeOptionalText(payload.exteriorColorCode),
    liveryCode:
      payload.liveryCode === null
        ? null
        : normalizeOptionalText(payload.liveryCode)
  });
  if (!created.ok) return created;

  dependencies.repositories.vehicleMarket.saveConfiguration(
    created.value
  );

  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicleMarket.configurationCreated",
      "vehicle",
      created.value.id,
      {
        configurationId: created.value.id,
        variantId: created.value.variantId,
        createdByCompanyId: created.value.createdByCompanyId,
        selectedOptionCodes: created.value.selectedOptionCodes
      }
    )
  );

  return created;
}

function handlePurchaseListing(
  command: CommandEnvelope,
  dependencies: VehicleMarketHandlerDependencies
): Result<OwnedVehicle, DomainError> {
  const payload = command.payload as PurchaseVehicleListingPayload;
  const company = dependencies.repositories.companies.getById(
    payload.companyId
  );
  if (!company || company.status !== "active") {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle market purchase requires an active company",
        { companyId: payload.companyId }
      )
    );
  }

  const actor = requireActor(command, company.id);
  if (!actor.ok) return actor;

  const listing = dependencies.repositories.vehicleMarket.getListing(
    payload.listingId
  );
  if (!listing) {
    return err(
      new DomainError(
        "ENTITY_NOT_FOUND",
        "Vehicle listing does not exist",
        { listingId: payload.listingId }
      )
    );
  }

  const available = validateListingAvailability(
    listing,
    command.issuedAtGameSecond
  );
  if (!available.ok) return available;

  const dealer = dependencies.repositories.vehicleMarket.getDealer(
    listing.dealerId
  );
  if (!dealer || !dealer.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle dealer is inactive or missing",
        { dealerId: listing.dealerId }
      )
    );
  }

  const model = dependencies.repositories.vehicleModels.getById(
    listing.modelId
  );
  const variant = dependencies.repositories.vehicleMarket.getVariant(
    listing.variantId
  );
  if (
    !model ||
    !model.active ||
    !variant ||
    !variant.active ||
    variant.modelId !== model.id
  ) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Vehicle listing references an invalid model or variant",
        {
          listingId: listing.id,
          modelId: listing.modelId,
          variantId: listing.variantId
        }
      )
    );
  }

  const configurationResult = resolvePurchaseConfiguration(
    listing,
    payload.configurationId,
    dependencies.repositories
  );
  if (!configurationResult.ok) return configurationResult;
  const configuration = configurationResult.value;

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

  const purchasePriceCents = units.moneyCents(
    Number(listing.askingPriceCents) +
      (listing.kind === "new"
        ? Number(configuration.priceAdjustmentCents)
        : 0)
  );
  if (Number(purchasePriceCents) < 0) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Vehicle listing resolves to a negative purchase price",
        { listingId: listing.id }
      )
    );
  }

  const funds = requireCash(
    dependencies.repositories,
    company.id,
    purchasePriceCents
  );
  if (!funds.ok) return funds;

  const terms =
    dependencies.lifecyclePolicy.quoteInitialOwnershipTerms(
      company.id,
      model.id,
      command.issuedAtGameSecond
    );

  const used = listing.usedSnapshot;
  if (listing.kind === "used" && used === null) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Used vehicle listing is missing its physical condition snapshot",
        { listingId: listing.id }
      )
    );
  }
  if (listing.kind === "new" && used !== null) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "New vehicle listing cannot contain a used vehicle snapshot",
        { listingId: listing.id }
      )
    );
  }

  const vehicle: OwnedVehicle = listing.kind === "used" && used
    ? {
        id: dependencies.ids.nextVehicleId(),
        companyId: company.id,
        modelId: model.id,
        configurationId: configuration.id,
        seatCapacity: configuration.seatCapacity,
        energyCapacityUnits: configuration.energyCapacityUnits,
        mileageM: used.mileageM,
        energyUnits: Math.min(
          used.energyUnits,
          configuration.energyCapacityUnits
        ),
        powertrainConditionPermille: used.powertrainConditionPermille,
        brakeConditionPermille: used.brakeConditionPermille,
        tireConditionPermille: used.tireConditionPermille,
        bodyConditionPermille: used.bodyConditionPermille,
        lastMaintenanceMileageM: used.lastMaintenanceMileageM,
        nextMaintenanceMileageM: used.nextMaintenanceMileageM,
        registeredAtGameSecond: used.registeredAtGameSecond,
        insuranceValidUntilGameSecond:
          used.insuranceValidUntilGameSecond,
        inspectionValidUntilGameSecond:
          used.inspectionValidUntilGameSecond,
        status: "available",
        activeIncident: null,
        depotStationId: payload.depotStationId,
        currentStationId: payload.depotStationId,
        availableAtGameSecond: command.issuedAtGameSecond,
        activeTripId: null,
        activeFleetTaskId: null
      }
    : {
        id: dependencies.ids.nextVehicleId(),
        companyId: company.id,
        modelId: model.id,
        configurationId: configuration.id,
        seatCapacity: configuration.seatCapacity,
        energyCapacityUnits: configuration.energyCapacityUnits,
        mileageM: units.distanceM(0),
        energyUnits: 0,
        powertrainConditionPermille: units.permille(1000),
        brakeConditionPermille: units.permille(1000),
        tireConditionPermille: units.permille(1000),
        bodyConditionPermille: units.permille(1000),
        lastMaintenanceMileageM: units.distanceM(0),
        nextMaintenanceMileageM: units.distanceM(
          model.serviceIntervalM
        ),
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
        currentStationId: payload.depotStationId,
        availableAtGameSecond: command.issuedAtGameSecond,
        activeTripId: null,
        activeFleetTaskId: null
      };

  dependencies.repositories.vehicles.save(vehicle);

  dependencies.repositories.vehicleMarket.saveListing({
    ...listing,
    stockCount: listing.stockCount - 1,
    status:
      listing.stockCount - 1 <= 0 ? "sold" : listing.status
  });

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
        configurationId: configuration.id,
        listingId: listing.id,
        dealerId: dealer.id,
        listingKind: listing.kind,
        purchasePriceCents,
        residualValueCents: terms.residualValueCents,
        usefulLifeDays: terms.usefulLifeDays,
        dailyInsuranceCents: terms.dailyInsuranceCents,
        dailyVehicleTaxCents: terms.dailyVehicleTaxCents
      },
      1
    )
  );

  dependencies.events.publish(
    createDomainEvent(
      command,
      "vehicleMarket.listingPurchased",
      "vehicle",
      vehicle.id,
      {
        vehicleId: vehicle.id,
        companyId: company.id,
        listingId: listing.id,
        dealerId: dealer.id,
        listingKind: listing.kind,
        purchasePriceCents
      },
      2
    )
  );

  return ok(vehicle);
}

function resolvePurchaseConfiguration(
  listing: VehicleListing,
  requestedConfigurationId: VehicleConfigurationId | null,
  repositories: RepositoryBundle
): Result<VehicleConfiguration, DomainError> {
  const configurationId =
    requestedConfigurationId ?? listing.configurationId;

  if (configurationId === null) {
    return err(
      new DomainError(
        "REFERENCE_NOT_FOUND",
        "Vehicle listing has no purchasable configuration",
        { listingId: listing.id }
      )
    );
  }

  const configuration =
    repositories.vehicleMarket.getConfiguration(configurationId);
  if (!configuration || !configuration.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle configuration is missing or inactive",
        { configurationId }
      )
    );
  }

  if (configuration.variantId !== listing.variantId) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Vehicle configuration does not belong to the listing variant",
        {
          listingId: listing.id,
          configurationId,
          listingVariantId: listing.variantId,
          configurationVariantId: configuration.variantId
        }
      )
    );
  }

  if (
    listing.kind === "used" &&
    listing.configurationId !== configuration.id
  ) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Used vehicle configuration is fixed and cannot be changed before purchase",
        { listingId: listing.id, configurationId }
      )
    );
  }

  return ok(configuration);
}

function validateListingAvailability(
  listing: VehicleListing,
  gameSecond: CommandEnvelope["issuedAtGameSecond"]
): Result<true, DomainError> {
  if (
    listing.status !== "available" ||
    listing.stockCount <= 0 ||
    Number(listing.availableFromGameSecond) > Number(gameSecond) ||
    (
      listing.expiresAtGameSecond !== null &&
      Number(listing.expiresAtGameSecond) < Number(gameSecond)
    )
  ) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle listing is not currently available",
        {
          listingId: listing.id,
          status: listing.status,
          stockCount: listing.stockCount
        }
      )
    );
  }
  return ok(true);
}

function configurationIdFromCommand(
  command: CommandEnvelope
): VehicleConfigurationId {
  const suffix = String(command.commandId).slice("command.".length);
  return ids.vehicleConfiguration(
    `vehicle_configuration.${suffix}`
  );
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
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
        "Command actor does not own this company",
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
        "Company does not have enough cash for the vehicle listing",
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
