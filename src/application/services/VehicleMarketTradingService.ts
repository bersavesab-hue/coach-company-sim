import type { CommandEnvelope } from "../../contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type VehicleConfigurationId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import {
  units,
  type GameSecond,
  type MoneyCents,
  type Permille
} from "../../core/units/Units.js";
import { accountBalanceCents } from "../../domain/finance/LedgerMath.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleAuction } from "../../domain/vehicle-market/VehicleAuction.js";
import { createVehicleConfiguration } from "../../domain/vehicle-market/VehicleConfigurationRules.js";
import type { VehicleConfiguration } from "../../domain/vehicle-market/VehicleConfiguration.js";
import type { VehicleInspectionReport } from "../../domain/vehicle-market/VehicleInspectionReport.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleNegotiationResult } from "../../domain/vehicle-market/VehicleNegotiation.js";
import type {
  CreateVehicleConfigurationPayload,
  InspectVehicleListingPayload,
  ListOwnedVehiclePayload,
  NegotiateVehicleListingPayload,
  PlaceVehicleAuctionBidPayload,
  SellVehicleToDealerPayload,
  PurchaseVehicleListingPayload,
  SettleVehicleAuctionPayload,
  StartVehicleAuctionPayload,
  WithdrawVehicleListingPayload
} from "../commands/vehicle-market/VehicleMarketCommands.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createDomainEvent } from "../events/createDomainEvent.js";
import type { RuntimeIdAllocator } from "../ids/RuntimeIdAllocator.js";
import type { VehicleLifecyclePolicy } from "../policies/VehicleLifecyclePolicy.js";
import type { VehicleMarketPolicy } from "../policies/VehicleMarketPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import type { VehicleMarketValuationService } from "./VehicleMarketValuationService.js";
import type { VehicleContentAccessService } from "./VehicleContentAccessService.js";

export interface VehicleMarketTradingDependencies {
  readonly repositories: RepositoryBundle;
  readonly ids: RuntimeIdAllocator;
  readonly events: DomainEventBus;
  readonly lifecyclePolicy: VehicleLifecyclePolicy;
  readonly marketPolicy: VehicleMarketPolicy;
  readonly valuation: VehicleMarketValuationService;
  readonly contentAccess: VehicleContentAccessService;
}

export interface VehicleMarketRefreshResult {
  readonly expiredListings: number;
  readonly releasedReservations: number;
  readonly repricedDealerListings: number;
}

export class VehicleMarketTradingService {
  constructor(
    private readonly dependencies: VehicleMarketTradingDependencies
  ) {}

  createConfiguration(
    command: CommandEnvelope,
    payload: CreateVehicleConfigurationPayload
  ): Result<VehicleConfiguration, DomainError> {
    const variant =
      this.dependencies.repositories.vehicleMarket.getVariant(
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
      const option =
        this.dependencies.repositories.vehicleMarket.getOption(code);
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
      customName: normalizeOptionalText(payload.customName),
      selectedOptions: options,
      exteriorColorCode: normalizeOptionalText(
        payload.exteriorColorCode
      ),
      liveryCode: normalizeOptionalText(payload.liveryCode)
    });
    if (!created.ok) return created;

    this.dependencies.repositories.vehicleMarket.saveConfiguration(
      created.value
    );
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.configurationCreated",
        "vehicleMarket",
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

  listOwnedVehicle(
    command: CommandEnvelope,
    payload: ListOwnedVehiclePayload
  ): Result<VehicleListing, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const vehicle = this.dependencies.repositories.vehicles.getById(
      payload.vehicleId
    );
    if (!vehicle || vehicle.companyId !== payload.companyId) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Company-owned vehicle does not exist",
          { vehicleId: payload.vehicleId }
        )
      );
    }

    if (
      vehicle.status !== "available" ||
      vehicle.activeTripId !== null ||
      vehicle.activeFleetTaskId !== null ||
      vehicle.currentStationId === null
    ) {
      return err(
        new DomainError(
          "VEHICLE_NOT_AVAILABLE",
          "Only an idle vehicle at a station can be listed for sale",
          { vehicleId: vehicle.id, status: vehicle.status }
        )
      );
    }

    if (
      this.dependencies.repositories.trips
        .findByVehicle(vehicle.id)
        .some(
          (trip) =>
            trip.status !== "completed" &&
            trip.status !== "cancelled"
        )
    ) {
      return err(
        new DomainError(
          "FLEET_TASK_CONFLICT",
          "Vehicle cannot be listed while a future trip still reserves it",
          { vehicleId: vehicle.id }
        )
      );
    }

    if (vehicle.configurationId === null) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Vehicle has no formal market configuration",
          { vehicleId: vehicle.id }
        )
      );
    }

    const configuration =
      this.dependencies.repositories.vehicleMarket.getConfiguration(
        vehicle.configurationId
      );
    const variant = configuration
      ? this.dependencies.repositories.vehicleMarket.getVariant(
          configuration.variantId
        )
      : undefined;
    const dealer =
      this.dependencies.repositories.vehicleMarket.getDealer(
        payload.dealerId
      );
    if (!configuration || !variant || !dealer || !dealer.active) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Vehicle configuration, variant or dealer is unavailable",
          {
            vehicleId: vehicle.id,
            dealerId: payload.dealerId
          }
        )
      );
    }

    const activeExisting =
      this.dependencies.repositories.vehicleMarket
        .findListings()
        .find(
          (listing) =>
            listing.sourceVehicleId === vehicle.id &&
            (listing.status === "available" ||
              listing.status === "reserved")
        );
    if (activeExisting) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Vehicle already has an active market listing",
          {
            vehicleId: vehicle.id,
            listingId: activeExisting.id
          }
        )
      );
    }

    if (
      payload.expiresAtGameSecond !== null &&
      Number(payload.expiresAtGameSecond) <=
        Number(command.issuedAtGameSecond)
    ) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Vehicle listing expiry must be in the future"
        )
      );
    }

    if (
      payload.reportedAccidentCount !== null &&
      (
        !Number.isSafeInteger(payload.reportedAccidentCount) ||
        payload.reportedAccidentCount < 0 ||
        payload.reportedAccidentCount >
          vehicle.recordedAccidentCount
      )
    ) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Reported accident count must be between zero and the recorded accident history",
          {
            reportedAccidentCount: payload.reportedAccidentCount,
            recordedAccidentCount: vehicle.recordedAccidentCount
          }
        )
      );
    }

    if (
      payload.reportedConditionPermille !== null &&
      (
        Number(payload.reportedConditionPermille) < 0 ||
        Number(payload.reportedConditionPermille) > 1000
      )
    ) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Reported condition must be within 0..1000"
        )
      );
    }

    const valuation =
      this.dependencies.valuation.estimateOwnedVehicle(
        vehicle.id,
        dealer.id,
        command.issuedAtGameSecond
      );
    if (!valuation.ok) return valuation;

    const askingPrice =
      payload.askingPriceCents ??
      valuation.value.suggestedAskingPriceCents;
    if (Number(askingPrice) <= 0) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Vehicle asking price must be positive"
        )
      );
    }

    const listingFee =
      this.dependencies.marketPolicy.listingFeeCents(dealer.kind);
    const funds = requireCash(
      this.dependencies.repositories,
      payload.companyId,
      listingFee
    );
    if (!funds.ok) return funds;

    const listing: VehicleListing = {
      id: listingIdFromCommand(command),
      dealerId: dealer.id,
      kind: "used",
      modelId: vehicle.modelId,
      variantId: variant.id,
      configurationId: configuration.id,
      sellerCompanyId: payload.companyId,
      sourceVehicleId: vehicle.id,
      askingPriceCents: askingPrice,
      sellerDisclosure: {
        reportedMileageM: vehicle.mileageM,
        reportedAccidentCount: payload.reportedAccidentCount,
        reportedConditionPermille:
          payload.reportedConditionPermille
      },
      reservation: null,
      stockCount: 1,
      usedSnapshot: snapshotForSale(vehicle),
      listedAtGameSecond: command.issuedAtGameSecond,
      availableFromGameSecond: command.issuedAtGameSecond,
      expiresAtGameSecond: payload.expiresAtGameSecond,
      status: "available"
    };

    this.dependencies.repositories.vehicleMarket.saveListing(listing);
    this.dependencies.repositories.vehicles.save({
      ...vehicle,
      status: "listed_for_sale"
    });

    this.publishMarketServiceCharge(
      command,
      payload.companyId,
      listingFee,
      "listing_fee",
      1
    );
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.listingCreated",
        "vehicleMarket",
        listing.id,
        {
          listingId: listing.id,
          vehicleId: vehicle.id,
          sellerCompanyId: payload.companyId,
          dealerId: dealer.id,
          askingPriceCents: askingPrice,
          fairMarketValueCents:
            valuation.value.fairMarketValueCents
        },
        2
      )
    );

    return ok(listing);
  }

  sellToDealer(
    command: CommandEnvelope,
    payload: SellVehicleToDealerPayload
  ): Result<VehicleListing, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const vehicle = this.dependencies.repositories.vehicles.getById(
      payload.vehicleId
    );
    if (
      !vehicle ||
      vehicle.companyId !== payload.companyId ||
      vehicle.status !== "available" ||
      vehicle.activeTripId !== null ||
      vehicle.activeFleetTaskId !== null ||
      vehicle.currentStationId === null ||
      vehicle.configurationId === null
    ) {
      return err(
        new DomainError(
          "VEHICLE_NOT_AVAILABLE",
          "Vehicle is not eligible for dealer acquisition",
          { vehicleId: payload.vehicleId }
        )
      );
    }

    if (
      this.dependencies.repositories.trips
        .findByVehicle(vehicle.id)
        .some(
          (trip) =>
            trip.status !== "completed" &&
            trip.status !== "cancelled"
        )
    ) {
      return err(
        new DomainError(
          "FLEET_TASK_CONFLICT",
          "Vehicle cannot be sold to a dealer while future trips reserve it"
        )
      );
    }

    const dealer =
      this.dependencies.repositories.vehicleMarket.getDealer(
        payload.dealerId
      );
    const configuration =
      this.dependencies.repositories.vehicleMarket.getConfiguration(
        vehicle.configurationId
      );
    const variant = configuration
      ? this.dependencies.repositories.vehicleMarket.getVariant(
          configuration.variantId
        )
      : undefined;
    if (
      !dealer ||
      !dealer.active ||
      dealer.kind === "auction_house" ||
      !configuration ||
      !variant
    ) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Dealer, configuration or variant is unavailable for acquisition"
        )
      );
    }

    const valuation =
      this.dependencies.valuation.estimateOwnedVehicle(
        vehicle.id,
        dealer.id,
        command.issuedAtGameSecond
      );
    if (!valuation.ok) return valuation;
    if (Number(valuation.value.dealerBuyOfferCents) <= 0) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Dealer acquisition offer must be positive"
        )
      );
    }

    const listing: VehicleListing = {
      id: listingIdFromCommand(command),
      dealerId: dealer.id,
      kind: "used",
      modelId: vehicle.modelId,
      variantId: variant.id,
      configurationId: configuration.id,
      sellerCompanyId: null,
      sourceVehicleId: vehicle.id,
      askingPriceCents:
        valuation.value.suggestedAskingPriceCents,
      sellerDisclosure: {
        reportedMileageM: vehicle.mileageM,
        reportedAccidentCount: vehicle.recordedAccidentCount,
        reportedConditionPermille: units.permille(
          Math.min(
            Number(vehicle.powertrainConditionPermille),
            Number(vehicle.brakeConditionPermille),
            Number(vehicle.tireConditionPermille),
            Number(vehicle.bodyConditionPermille)
          )
        )
      },
      reservation: null,
      stockCount: 1,
      usedSnapshot: snapshotForSale(vehicle),
      listedAtGameSecond: command.issuedAtGameSecond,
      availableFromGameSecond: command.issuedAtGameSecond,
      expiresAtGameSecond: null,
      status: "available"
    };

    this.dependencies.repositories.vehicleMarket.saveListing(listing);
    this.dependencies.repositories.vehicles.save({
      ...vehicle,
      status: "sold"
    });

    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicle.sold",
        "vehicle",
        vehicle.id,
        {
          vehicleId: vehicle.id,
          companyId: payload.companyId,
          proceedsCents: valuation.value.dealerBuyOfferCents
        },
        1
      )
    );
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.listingCreated",
        "vehicleMarket",
        listing.id,
        {
          listingId: listing.id,
          vehicleId: vehicle.id,
          sellerCompanyId: null,
          dealerId: dealer.id,
          acquisitionPriceCents:
            valuation.value.dealerBuyOfferCents,
          askingPriceCents: listing.askingPriceCents
        },
        2
      )
    );

    return ok(listing);
  }

  withdrawListing(
    command: CommandEnvelope,
    payload: WithdrawVehicleListingPayload
  ): Result<VehicleListing, DomainError> {
    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
        payload.listingId
      );
    if (!listing || listing.sellerCompanyId === null) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Company vehicle listing does not exist",
          { listingId: payload.listingId }
        )
      );
    }

    const actor = requireActor(command, listing.sellerCompanyId);
    if (!actor.ok) return actor;

    if (listing.status !== "available") {
      return err(
        new DomainError(
          "INVALID_STATE_TRANSITION",
          "Only an available listing can be withdrawn",
          { listingId: listing.id, status: listing.status }
        )
      );
    }

    const activeReservation =
      listing.reservation !== null &&
      Number(listing.reservation.expiresAtGameSecond) >
        Number(command.issuedAtGameSecond);
    const activeAuction =
      this.dependencies.repositories.vehicleMarket
        .findAuctions()
        .some(
          (auction) =>
            auction.listingId === listing.id &&
            (auction.status === "scheduled" ||
              auction.status === "open") &&
            Number(auction.endsAtGameSecond) >
              Number(command.issuedAtGameSecond)
        );

    if (activeReservation || activeAuction) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Reserved or actively auctioned listing cannot be withdrawn",
          { listingId: listing.id }
        )
      );
    }

    const updated: VehicleListing = {
      ...listing,
      reservation: null,
      status: "withdrawn"
    };
    this.dependencies.repositories.vehicleMarket.saveListing(updated);

    if (listing.sourceVehicleId !== null) {
      const vehicle =
        this.dependencies.repositories.vehicles.getById(
          listing.sourceVehicleId
        );
      if (
        vehicle &&
        vehicle.companyId === listing.sellerCompanyId &&
        vehicle.status === "listed_for_sale"
      ) {
        this.dependencies.repositories.vehicles.save({
          ...vehicle,
          status: "available"
        });
      }
    }

    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.listingWithdrawn",
        "vehicleMarket",
        listing.id,
        { listingId: listing.id }
      )
    );

    return ok(updated);
  }

  inspectListing(
    command: CommandEnvelope,
    payload: InspectVehicleListingPayload
  ): Result<VehicleInspectionReport, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
        payload.listingId
      );
    if (
      !listing ||
      listing.kind !== "used" ||
      listing.usedSnapshot === null ||
      listing.status !== "available"
    ) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Inspectable used vehicle listing does not exist",
          { listingId: payload.listingId }
        )
      );
    }

    if (listing.sellerCompanyId === payload.companyId) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Seller cannot buy a market inspection of its own listing"
        )
      );
    }

    const cost =
      this.dependencies.marketPolicy.inspectionCostCents(
        payload.level
      );
    const funds = requireCash(
      this.dependencies.repositories,
      payload.companyId,
      cost
    );
    if (!funds.ok) return funds;

    const snapshot = listing.usedSnapshot;
    const mechanical = units.permille(
      Math.floor(
        (
          Number(snapshot.powertrainConditionPermille) +
          Number(snapshot.brakeConditionPermille) +
          Number(snapshot.tireConditionPermille)
        ) / 3
      )
    );
    const reported = listing.sellerDisclosure;
    const report: VehicleInspectionReport = {
      id: inspectionIdFromCommand(command),
      listingId: listing.id,
      requestedByCompanyId: payload.companyId,
      level: payload.level,
      inspectedAtGameSecond: command.issuedAtGameSecond,
      costCents: cost,
      mileageVerified: true,
      verifiedMileageM: Number(snapshot.mileageM),
      mechanicalConditionPermille: mechanical,
      bodyConditionPermille: snapshot.bodyConditionPermille,
      accidentEvidenceCount:
        payload.level === "full"
          ? snapshot.recordedAccidentCount
          : null,
      disclosureMismatch:
        reported === null ||
        Number(reported.reportedMileageM) !==
          Number(snapshot.mileageM) ||
        (
          reported.reportedAccidentCount !== null &&
          reported.reportedAccidentCount <
            snapshot.recordedAccidentCount
        ) ||
        (
          reported.reportedConditionPermille !== null &&
          Number(reported.reportedConditionPermille) >
            Math.min(
              Number(mechanical),
              Number(snapshot.bodyConditionPermille)
            )
        )
    };

    this.dependencies.repositories.vehicleMarket.saveInspectionReport(
      report
    );
    this.publishMarketServiceCharge(
      command,
      payload.companyId,
      cost,
      `inspection_${payload.level}`,
      1
    );
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.inspectionCompleted",
        "vehicleMarket",
        report.id,
        {
          inspectionReportId: report.id,
          listingId: listing.id,
          requestedByCompanyId: payload.companyId,
          level: report.level,
          disclosureMismatch: report.disclosureMismatch
        },
        2
      )
    );

    return ok(report);
  }

  negotiateListing(
    command: CommandEnvelope,
    payload: NegotiateVehicleListingPayload
  ): Result<VehicleNegotiationResult, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
        payload.listingId
      );
    if (!listing || listing.status !== "available") {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Negotiable listing does not exist",
          { listingId: payload.listingId }
        )
      );
    }
    if (listing.sellerCompanyId === payload.companyId) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Seller cannot negotiate with its own listing"
        )
      );
    }
    if (Number(payload.offerPriceCents) <= 0) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Negotiation offer must be positive"
        )
      );
    }

    if (this.hasActiveAuction(listing.id, command.issuedAtGameSecond)) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Auction listing cannot be privately negotiated",
          { listingId: listing.id }
        )
      );
    }

    const activeReservation =
      activeReservationAt(listing, command.issuedAtGameSecond);
    if (
      activeReservation !== null &&
      activeReservation.buyerCompanyId !== payload.companyId
    ) {
      return err(
        new DomainError(
          "VEHICLE_MARKET_RESERVATION",
          "Listing is temporarily reserved for another buyer",
          { listingId: listing.id }
        )
      );
    }

    const dealer =
      this.dependencies.repositories.vehicleMarket.getDealer(
        listing.dealerId
      );
    if (!dealer) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Listing dealer does not exist"
        )
      );
    }

    const floor = units.moneyCents(
      Math.floor(
        (
          Number(listing.askingPriceCents) *
          Number(
            this.dependencies.marketPolicy.negotiationFloorPermille(
              dealer.kind
            )
          )
        ) / 1000
      )
    );

    if (Number(payload.offerPriceCents) < Number(floor)) {
      const result: VehicleNegotiationResult = {
        status: "countered",
        agreedPriceCents: null,
        counterPriceCents: floor
      };
      this.dependencies.events.publish(
        createDomainEvent(
          command,
          "vehicleMarket.negotiationCountered",
          "vehicleMarket",
          listing.id,
          {
            listingId: listing.id,
            buyerCompanyId: payload.companyId,
            offerPriceCents: payload.offerPriceCents,
            counterPriceCents: floor
          }
        )
      );
      return ok(result);
    }

    const agreed = units.moneyCents(
      Math.min(
        Number(listing.askingPriceCents),
        Number(payload.offerPriceCents)
      )
    );
    const reservationSeconds =
      this.dependencies.marketPolicy.negotiationReservationSeconds();
    if (
      !Number.isSafeInteger(reservationSeconds) ||
      reservationSeconds <= 0
    ) {
      throw new Error(
        "Vehicle market reservation seconds must be positive"
      );
    }

    this.dependencies.repositories.vehicleMarket.saveListing({
      ...listing,
      reservation: {
        buyerCompanyId: payload.companyId,
        agreedPriceCents: agreed,
        expiresAtGameSecond: units.gameSecond(
          Number(command.issuedAtGameSecond) + reservationSeconds
        )
      }
    });

    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.negotiationAccepted",
        "vehicleMarket",
        listing.id,
        {
          listingId: listing.id,
          buyerCompanyId: payload.companyId,
          offerPriceCents: payload.offerPriceCents,
          agreedPriceCents: agreed
        }
      )
    );

    return ok({
      status: "accepted",
      agreedPriceCents: agreed,
      counterPriceCents: null
    });
  }

  purchaseListing(
    command: CommandEnvelope,
    payload: PurchaseVehicleListingPayload
  ): Result<OwnedVehicle, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
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
    if (listing.sellerCompanyId === payload.companyId) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Company cannot purchase its own listed vehicle"
        )
      );
    }

    const contentAccess = this.dependencies.contentAccess.evaluateModel(
      payload.companyId,
      listing.modelId,
      command.issuedAtGameSecond
    );
    if (!contentAccess.unlocked) {
      return err(
        new DomainError(
          "VEHICLE_MODEL_LOCKED",
          "Vehicle model has not been unlocked by company progression",
          {
            modelId: listing.modelId,
            unlockTier: contentAccess.tier,
            missing: contentAccess.missing
          }
        )
      );
    }

    if (this.hasActiveAuction(listing.id, command.issuedAtGameSecond)) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Active auction listing must settle through the auction"
        )
      );
    }

    const reservation =
      activeReservationAt(listing, command.issuedAtGameSecond);
    if (
      reservation !== null &&
      reservation.buyerCompanyId !== payload.companyId
    ) {
      return err(
        new DomainError(
          "VEHICLE_MARKET_RESERVATION",
          "Listing is reserved for another buyer",
          { listingId: listing.id }
        )
      );
    }

    const purchasePrice =
      reservation?.agreedPriceCents ?? listing.askingPriceCents;

    return this.completePurchase(
      command,
      payload.companyId,
      listing,
      payload.configurationId,
      payload.depotStationId,
      purchasePrice,
      1
    );
  }

  startAuction(
    command: CommandEnvelope,
    payload: StartVehicleAuctionPayload
  ): Result<VehicleAuction, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
        payload.listingId
      );
    if (
      !listing ||
      listing.sellerCompanyId !== payload.companyId ||
      listing.sourceVehicleId === null ||
      listing.status !== "available"
    ) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Auction requires an active company-owned used listing",
          { listingId: payload.listingId }
        )
      );
    }
    const dealer =
      this.dependencies.repositories.vehicleMarket.getDealer(
        listing.dealerId
      );
    if (!dealer || dealer.kind !== "auction_house") {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Vehicle auction must use an auction-house dealer"
        )
      );
    }
    if (
      Number(payload.endsAtGameSecond) <=
        Number(payload.startsAtGameSecond) ||
      Number(payload.startsAtGameSecond) <
        Number(command.issuedAtGameSecond) ||
      Number(payload.reservePriceCents) <= 0
    ) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Auction time window or reserve price is invalid"
        )
      );
    }
    if (
      activeReservationAt(listing, command.issuedAtGameSecond) !==
        null ||
      this.dependencies.repositories.vehicleMarket
        .findAuctions()
        .some(
          (auction) =>
            auction.listingId === listing.id &&
            (auction.status === "scheduled" ||
              auction.status === "open")
        )
    ) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Listing already has a reservation or auction"
        )
      );
    }

    const auction: VehicleAuction = {
      id: auctionIdFromCommand(command),
      listingId: listing.id,
      sellerCompanyId: payload.companyId,
      startsAtGameSecond: payload.startsAtGameSecond,
      endsAtGameSecond: payload.endsAtGameSecond,
      reservePriceCents: payload.reservePriceCents,
      highestBidCents: null,
      highestBidderCompanyId: null,
      status:
        Number(payload.startsAtGameSecond) ===
        Number(command.issuedAtGameSecond)
          ? "open"
          : "scheduled"
    };

    this.dependencies.repositories.vehicleMarket.saveAuction(auction);
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.auctionStarted",
        "vehicleMarket",
        auction.id,
        {
          auctionId: auction.id,
          listingId: listing.id,
          sellerCompanyId: payload.companyId,
          reservePriceCents: auction.reservePriceCents,
          startsAtGameSecond: auction.startsAtGameSecond,
          endsAtGameSecond: auction.endsAtGameSecond
        }
      )
    );
    return ok(auction);
  }

  placeAuctionBid(
    command: CommandEnvelope,
    payload: PlaceVehicleAuctionBidPayload
  ): Result<VehicleAuction, DomainError> {
    const companyCheck = this.requireActiveCompany(
      command,
      payload.companyId
    );
    if (!companyCheck.ok) return companyCheck;

    const auction =
      this.dependencies.repositories.vehicleMarket.getAuction(
        payload.auctionId
      );
    if (!auction) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle auction does not exist"
        )
      );
    }
    if (auction.sellerCompanyId === payload.companyId) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "Seller cannot bid on its own vehicle"
        )
      );
    }
    if (
      Number(command.issuedAtGameSecond) <
        Number(auction.startsAtGameSecond) ||
      Number(command.issuedAtGameSecond) >=
        Number(auction.endsAtGameSecond) ||
      (auction.status !== "scheduled" && auction.status !== "open")
    ) {
      return err(
        new DomainError(
          "VEHICLE_AUCTION_CLOSED",
          "Vehicle auction is not accepting bids"
        )
      );
    }

    const increment =
      this.dependencies.marketPolicy.auctionMinimumIncrementCents(
        auction.highestBidCents
      );
    const minimumBid =
      (auction.highestBidCents === null
        ? 0
        : Number(auction.highestBidCents)) +
      Number(increment);
    if (
      Number(payload.bidCents) < minimumBid ||
      Number(payload.bidCents) <= 0
    ) {
      return err(
        new DomainError(
          "VEHICLE_BID_TOO_LOW",
          "Auction bid does not meet the minimum increment",
          { minimumBidCents: minimumBid }
        )
      );
    }

    const funds = requireCash(
      this.dependencies.repositories,
      payload.companyId,
      payload.bidCents
    );
    if (!funds.ok) return funds;

    const updated: VehicleAuction = {
      ...auction,
      highestBidCents: payload.bidCents,
      highestBidderCompanyId: payload.companyId,
      status: "open"
    };
    this.dependencies.repositories.vehicleMarket.saveAuction(updated);
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.auctionBidPlaced",
        "vehicleMarket",
        auction.id,
        {
          auctionId: auction.id,
          listingId: auction.listingId,
          bidderCompanyId: payload.companyId,
          bidCents: payload.bidCents
        }
      )
    );
    return ok(updated);
  }

  settleAuction(
    command: CommandEnvelope,
    payload: SettleVehicleAuctionPayload
  ): Result<VehicleAuction, DomainError> {
    const auction =
      this.dependencies.repositories.vehicleMarket.getAuction(
        payload.auctionId
      );
    if (!auction) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle auction does not exist"
        )
      );
    }
    const actor = requireActor(command, auction.sellerCompanyId);
    if (!actor.ok || payload.companyId !== auction.sellerCompanyId) {
      return actor.ok
        ? err(
            new DomainError(
              "INVALID_ARGUMENT",
              "Auction settlement company must be the seller"
            )
          )
        : actor;
    }
    if (
      Number(command.issuedAtGameSecond) <
      Number(auction.endsAtGameSecond)
    ) {
      return err(
        new DomainError(
          "VEHICLE_AUCTION_CLOSED",
          "Auction cannot settle before its end time"
        )
      );
    }
    if (auction.status === "won" || auction.status === "no_sale") {
      return err(
        new DomainError(
          "INVALID_STATE_TRANSITION",
          "Auction is already settled"
        )
      );
    }

    if (
      auction.highestBidCents === null ||
      auction.highestBidderCompanyId === null ||
      Number(auction.highestBidCents) <
        Number(auction.reservePriceCents)
    ) {
      const noSale: VehicleAuction = {
        ...auction,
        status: "no_sale"
      };
      this.dependencies.repositories.vehicleMarket.saveAuction(noSale);
      this.dependencies.events.publish(
        createDomainEvent(
          command,
          "vehicleMarket.auctionSettled",
          "vehicleMarket",
          auction.id,
          {
            auctionId: auction.id,
            listingId: auction.listingId,
            status: "no_sale"
          }
        )
      );
      return ok(noSale);
    }

    const buyer =
      this.dependencies.repositories.companies.getById(
        auction.highestBidderCompanyId
      );
    if (!buyer || buyer.status !== "active") {
      return err(
        new DomainError(
          "ENTITY_INACTIVE",
          "Winning bidder company is inactive"
        )
      );
    }
    const funds = requireCash(
      this.dependencies.repositories,
      buyer.id,
      auction.highestBidCents
    );
    if (!funds.ok) return funds;

    const listing =
      this.dependencies.repositories.vehicleMarket.getListing(
        auction.listingId
      );
    if (!listing) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Auction listing no longer exists"
        )
      );
    }

    const purchased = this.completePurchase(
      command,
      buyer.id,
      listing,
      listing.configurationId,
      null,
      auction.highestBidCents,
      1
    );
    if (!purchased.ok) return err(purchased.error);

    const sellerFee = units.moneyCents(
      Math.floor(
        (
          Number(auction.highestBidCents) *
          Number(
            this.dependencies.marketPolicy.auctionSellerFeePermille()
          )
        ) / 1000
      )
    );
    this.publishMarketServiceCharge(
      command,
      auction.sellerCompanyId,
      sellerFee,
      "auction_seller_fee",
      4
    );

    const won: VehicleAuction = {
      ...auction,
      status: "won"
    };
    this.dependencies.repositories.vehicleMarket.saveAuction(won);
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.auctionSettled",
        "vehicleMarket",
        auction.id,
        {
          auctionId: auction.id,
          listingId: auction.listingId,
          status: "won",
          buyerCompanyId: buyer.id,
          winningBidCents: auction.highestBidCents
        },
        5
      )
    );
    return ok(won);
  }

  refresh(
    gameSecond: GameSecond
  ): Result<VehicleMarketRefreshResult, DomainError> {
    let expiredListings = 0;
    let releasedReservations = 0;
    let repricedDealerListings = 0;

    for (const listing of this.dependencies.repositories.vehicleMarket.findListings()) {
      if (
        listing.status === "available" &&
        listing.expiresAtGameSecond !== null &&
        Number(listing.expiresAtGameSecond) < Number(gameSecond)
      ) {
        this.dependencies.repositories.vehicleMarket.saveListing({
          ...listing,
          reservation: null,
          status: "expired"
        });
        this.releaseSellerVehicle(listing);
        expiredListings += 1;
        continue;
      }

      let current = listing;
      if (
        current.reservation !== null &&
        Number(current.reservation.expiresAtGameSecond) <=
          Number(gameSecond)
      ) {
        current = { ...current, reservation: null };
        this.dependencies.repositories.vehicleMarket.saveListing(current);
        releasedReservations += 1;
      }

      if (
        current.status === "available" &&
        current.sellerCompanyId === null &&
        current.reservation === null
      ) {
        const valuation =
          this.dependencies.valuation.estimateListing(
            current,
            gameSecond
          );
        if (
          valuation.ok &&
          Number(current.askingPriceCents) !==
            Number(valuation.value.suggestedAskingPriceCents)
        ) {
          this.dependencies.repositories.vehicleMarket.saveListing({
            ...current,
            askingPriceCents:
              valuation.value.suggestedAskingPriceCents
          });
          repricedDealerListings += 1;
        }
      }
    }

    for (const auction of this.dependencies.repositories.vehicleMarket.findAuctions()) {
      if (
        auction.status === "scheduled" &&
        Number(auction.startsAtGameSecond) <= Number(gameSecond) &&
        Number(auction.endsAtGameSecond) > Number(gameSecond)
      ) {
        this.dependencies.repositories.vehicleMarket.saveAuction({
          ...auction,
          status: "open"
        });
      }
    }

    return ok({
      expiredListings,
      releasedReservations,
      repricedDealerListings
    });
  }

  private completePurchase(
    command: CommandEnvelope,
    buyerCompanyId: CompanyId,
    listing: VehicleListing,
    requestedConfigurationId: VehicleConfigurationId | null,
    depotStationId: PurchaseVehicleListingPayload["depotStationId"],
    purchasePriceCents: MoneyCents,
    eventOrdinalStart: number
  ): Result<OwnedVehicle, DomainError> {
    const dealer =
      this.dependencies.repositories.vehicleMarket.getDealer(
        listing.dealerId
      );
    const model =
      this.dependencies.repositories.vehicleModels.getById(
        listing.modelId
      );
    const variant =
      this.dependencies.repositories.vehicleMarket.getVariant(
        listing.variantId
      );
    if (
      !dealer ||
      !dealer.active ||
      !model ||
      !model.active ||
      !variant ||
      !variant.active ||
      variant.modelId !== model.id
    ) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Listing references invalid dealer, model or variant"
        )
      );
    }

    const configurationResult = resolvePurchaseConfiguration(
      listing,
      requestedConfigurationId,
      this.dependencies.repositories
    );
    if (!configurationResult.ok) return configurationResult;
    const configuration = configurationResult.value;

    const finalPurchasePriceCents = units.moneyCents(
      Number(purchasePriceCents) +
      (listing.kind === "new"
        ? Number(configuration.priceAdjustmentCents)
        : 0)
    );

    const funds = requireCash(
      this.dependencies.repositories,
      buyerCompanyId,
      finalPurchasePriceCents
    );
    if (!funds.ok) return funds;

    if (depotStationId !== null) {
      const depot =
        this.dependencies.repositories.stations.getById(
          depotStationId
        );
      if (!depot || depot.status !== "active") {
        return err(
          new DomainError(
            "ENTITY_NOT_FOUND",
            "Buyer depot station is missing or inactive"
          )
        );
      }
    }

    const terms =
      this.dependencies.lifecyclePolicy.quoteInitialOwnershipTerms(
        buyerCompanyId,
        model.id,
        command.issuedAtGameSecond
      );

    const vehicleResult =
      listing.sourceVehicleId !== null
        ? this.transferSourceVehicle(
            listing,
            buyerCompanyId,
            depotStationId
          )
        : this.createDealerInventoryVehicle(
            listing,
            buyerCompanyId,
            configuration,
            depotStationId,
            command.issuedAtGameSecond,
            model.serviceIntervalM,
            terms.initialInsuranceValidDays,
            terms.initialInspectionValidDays
          );
    if (!vehicleResult.ok) return vehicleResult;
    const vehicle = vehicleResult.value;

    this.dependencies.repositories.vehicleMarket.saveListing({
      ...listing,
      reservation: null,
      stockCount: Math.max(0, listing.stockCount - 1),
      status:
        listing.sourceVehicleId !== null ||
        listing.stockCount - 1 <= 0
          ? "sold"
          : "available"
    });

    let ordinal = eventOrdinalStart;
    if (listing.sellerCompanyId !== null) {
      this.dependencies.events.publish(
        createDomainEvent(
          command,
          "vehicle.sold",
          "vehicle",
          vehicle.id,
          {
            vehicleId: vehicle.id,
            companyId: listing.sellerCompanyId,
            proceedsCents: finalPurchasePriceCents
          },
          ordinal++
        )
      );
    }

    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicle.purchased",
        "vehicle",
        vehicle.id,
        {
          vehicleId: vehicle.id,
          companyId: buyerCompanyId,
          vehicleModelId: model.id,
          configurationId: configuration.id,
          listingId: listing.id,
          dealerId: dealer.id,
          listingKind: listing.kind,
          purchasePriceCents: finalPurchasePriceCents,
          residualValueCents: terms.residualValueCents,
          usefulLifeDays: terms.usefulLifeDays,
          dailyInsuranceCents: terms.dailyInsuranceCents,
          dailyVehicleTaxCents: terms.dailyVehicleTaxCents
        },
        ordinal++
      )
    );

    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.listingPurchased",
        "vehicleMarket",
        listing.id,
        {
          vehicleId: vehicle.id,
          companyId: buyerCompanyId,
          sellerCompanyId: listing.sellerCompanyId,
          listingId: listing.id,
          dealerId: dealer.id,
          listingKind: listing.kind,
          purchasePriceCents: finalPurchasePriceCents
        },
        ordinal
      )
    );

    return ok(vehicle);
  }

  private transferSourceVehicle(
    listing: VehicleListing,
    buyerCompanyId: CompanyId,
    depotStationId: PurchaseVehicleListingPayload["depotStationId"]
  ): Result<OwnedVehicle, DomainError> {
    if (
      listing.sourceVehicleId === null ||
      listing.usedSnapshot === null
    ) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Company listing is missing transfer source facts"
        )
      );
    }

    const vehicle =
      this.dependencies.repositories.vehicles.getById(
        listing.sourceVehicleId
      );
    const expectedStatus =
      listing.sellerCompanyId === null
        ? "sold"
        : "listed_for_sale";

    if (
      !vehicle ||
      (
        listing.sellerCompanyId !== null &&
        vehicle.companyId !== listing.sellerCompanyId
      ) ||
      vehicle.status !== expectedStatus
    ) {
      return err(
        new DomainError(
          "VEHICLE_LISTING_CONFLICT",
          "Listed source vehicle is no longer transferable",
          { vehicleId: listing.sourceVehicleId }
        )
      );
    }

    const transferred: OwnedVehicle = {
      ...vehicle,
      companyId: buyerCompanyId,
      previousOwnerCount:
        listing.usedSnapshot.previousOwnerCount,
      recordedAccidentCount:
        listing.usedSnapshot.recordedAccidentCount,
      status: "available",
      depotStationId:
        depotStationId ?? vehicle.currentStationId,
      activeTripId: null,
      activeFleetTaskId: null
    };
    this.dependencies.repositories.vehicles.save(transferred);
    return ok(transferred);
  }

  private createDealerInventoryVehicle(
    listing: VehicleListing,
    buyerCompanyId: CompanyId,
    configuration: VehicleConfiguration,
    depotStationId: PurchaseVehicleListingPayload["depotStationId"],
    gameSecond: GameSecond,
    serviceIntervalM: number,
    insuranceDays: number,
    inspectionDays: number
  ): Result<OwnedVehicle, DomainError> {
    const used = listing.usedSnapshot;
    if (listing.kind === "used" && used === null) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Used listing has no physical snapshot"
        )
      );
    }
    if (listing.kind === "new" && used !== null) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "New listing cannot contain a used snapshot"
        )
      );
    }

    const vehicle: OwnedVehicle =
      listing.kind === "used" && used
        ? {
            id: this.dependencies.ids.nextVehicleId(),
            companyId: buyerCompanyId,
            modelId: listing.modelId,
            configurationId: configuration.id,
            seatCapacity: configuration.seatCapacity,
            energyCapacityUnits:
              configuration.energyCapacityUnits,
            previousOwnerCount: used.previousOwnerCount,
            recordedAccidentCount: used.recordedAccidentCount,
            mileageM: used.mileageM,
            energyUnits: Math.min(
              used.energyUnits,
              configuration.energyCapacityUnits
            ),
            powertrainConditionPermille:
              used.powertrainConditionPermille,
            brakeConditionPermille:
              used.brakeConditionPermille,
            tireConditionPermille:
              used.tireConditionPermille,
            bodyConditionPermille:
              used.bodyConditionPermille,
            lastMaintenanceMileageM:
              used.lastMaintenanceMileageM,
            nextMaintenanceMileageM:
              used.nextMaintenanceMileageM,
            registeredAtGameSecond:
              used.registeredAtGameSecond,
            insuranceValidUntilGameSecond:
              used.insuranceValidUntilGameSecond,
            inspectionValidUntilGameSecond:
              used.inspectionValidUntilGameSecond,
            status: "available",
            activeIncident: null,
            depotStationId,
            currentStationId: depotStationId,
            availableAtGameSecond: gameSecond,
            activeTripId: null,
            activeFleetTaskId: null
          }
        : {
            id: this.dependencies.ids.nextVehicleId(),
            companyId: buyerCompanyId,
            modelId: listing.modelId,
            configurationId: configuration.id,
            seatCapacity: configuration.seatCapacity,
            energyCapacityUnits:
              configuration.energyCapacityUnits,
            previousOwnerCount: 0,
            recordedAccidentCount: 0,
            mileageM: units.distanceM(0),
            energyUnits: 0,
            powertrainConditionPermille: units.permille(1000),
            brakeConditionPermille: units.permille(1000),
            tireConditionPermille: units.permille(1000),
            bodyConditionPermille: units.permille(1000),
            lastMaintenanceMileageM: units.distanceM(0),
            nextMaintenanceMileageM: units.distanceM(
              serviceIntervalM
            ),
            registeredAtGameSecond: gameSecond,
            insuranceValidUntilGameSecond: addDays(
              gameSecond,
              insuranceDays
            ),
            inspectionValidUntilGameSecond: addDays(
              gameSecond,
              inspectionDays
            ),
            status: "available",
            activeIncident: null,
            depotStationId,
            currentStationId: depotStationId,
            availableAtGameSecond: gameSecond,
            activeTripId: null,
            activeFleetTaskId: null
          };

    this.dependencies.repositories.vehicles.save(vehicle);
    return ok(vehicle);
  }

  private hasActiveAuction(
    listingId: VehicleListing["id"],
    gameSecond: GameSecond
  ): boolean {
    return this.dependencies.repositories.vehicleMarket
      .findAuctions()
      .some(
        (auction) =>
          auction.listingId === listingId &&
          (auction.status === "scheduled" ||
            auction.status === "open") &&
          Number(auction.endsAtGameSecond) >
            Number(gameSecond)
      );
  }

  private releaseSellerVehicle(listing: VehicleListing): void {
    if (
      listing.sourceVehicleId === null ||
      listing.sellerCompanyId === null
    ) {
      return;
    }
    const vehicle =
      this.dependencies.repositories.vehicles.getById(
        listing.sourceVehicleId
      );
    if (
      vehicle &&
      vehicle.companyId === listing.sellerCompanyId &&
      vehicle.status === "listed_for_sale"
    ) {
      this.dependencies.repositories.vehicles.save({
        ...vehicle,
        status: "available"
      });
    }
  }

  private publishMarketServiceCharge(
    command: CommandEnvelope,
    companyId: CompanyId,
    costCents: MoneyCents,
    serviceKind: string,
    ordinal: number
  ): void {
    if (Number(costCents) <= 0) return;
    this.dependencies.events.publish(
      createDomainEvent(
        command,
        "vehicleMarket.serviceCharged",
        "company",
        companyId,
        {
          companyId,
          costCents,
          serviceKind
        },
        ordinal
      )
    );
  }

  private requireActiveCompany(
    command: CommandEnvelope,
    companyId: CompanyId
  ): Result<true, DomainError> {
    const company =
      this.dependencies.repositories.companies.getById(companyId);
    if (!company || company.status !== "active") {
      return err(
        new DomainError(
          "ENTITY_INACTIVE",
          "Vehicle market action requires an active company",
          { companyId }
        )
      );
    }
    return requireActor(command, companyId);
  }
}

function snapshotForSale(
  vehicle: OwnedVehicle
): NonNullable<VehicleListing["usedSnapshot"]> {
  return {
    mileageM: vehicle.mileageM,
    energyUnits: vehicle.energyUnits,
    lastMaintenanceMileageM: vehicle.lastMaintenanceMileageM,
    nextMaintenanceMileageM: vehicle.nextMaintenanceMileageM,
    registeredAtGameSecond: vehicle.registeredAtGameSecond,
    insuranceValidUntilGameSecond:
      vehicle.insuranceValidUntilGameSecond,
    inspectionValidUntilGameSecond:
      vehicle.inspectionValidUntilGameSecond,
    powertrainConditionPermille:
      vehicle.powertrainConditionPermille,
    brakeConditionPermille: vehicle.brakeConditionPermille,
    tireConditionPermille: vehicle.tireConditionPermille,
    bodyConditionPermille: vehicle.bodyConditionPermille,
    previousOwnerCount: vehicle.previousOwnerCount + 1,
    recordedAccidentCount: vehicle.recordedAccidentCount
  };
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
        "Vehicle listing has no purchasable configuration"
      )
    );
  }
  const configuration =
    repositories.vehicleMarket.getConfiguration(configurationId);
  if (!configuration || !configuration.active) {
    return err(
      new DomainError(
        "ENTITY_INACTIVE",
        "Vehicle configuration is missing or inactive"
      )
    );
  }
  if (configuration.variantId !== listing.variantId) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Configuration does not belong to listing variant"
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
        "Used vehicle configuration is fixed before purchase"
      )
    );
  }
  return ok(configuration);
}

function validateListingAvailability(
  listing: VehicleListing,
  gameSecond: GameSecond
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

function activeReservationAt(
  listing: VehicleListing,
  gameSecond: GameSecond
): VehicleListing["reservation"] {
  if (
    listing.reservation === null ||
    Number(listing.reservation.expiresAtGameSecond) <=
      Number(gameSecond)
  ) {
    return null;
  }
  return listing.reservation;
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
        "Command actor does not own this market action",
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
  if (Number(required) <= 0) return ok(true);
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

function listingIdFromCommand(command: CommandEnvelope) {
  return ids.vehicleListing(
    `vehicle_listing.${commandSuffix(command)}`
  );
}

function configurationIdFromCommand(command: CommandEnvelope) {
  return ids.vehicleConfiguration(
    `vehicle_configuration.${commandSuffix(command)}`
  );
}

function inspectionIdFromCommand(command: CommandEnvelope) {
  return ids.vehicleInspectionReport(
    `vehicle_inspection.${commandSuffix(command)}`
  );
}

function auctionIdFromCommand(command: CommandEnvelope) {
  return ids.vehicleAuction(
    `vehicle_auction.${commandSuffix(command)}`
  );
}

function commandSuffix(command: CommandEnvelope): string {
  return String(command.commandId)
    .slice("command.".length)
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function normalizeOptionalText(
  value: string | null
): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function addDays(gameSecond: GameSecond, days: number) {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error(
      "Vehicle document validity days must be positive"
    );
  }
  return units.gameSecond(
    Number(gameSecond) + days * SECONDS_PER_DAY
  );
}
