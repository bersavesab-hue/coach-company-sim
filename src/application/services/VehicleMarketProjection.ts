import type {
  VehicleAuctionDto,
  VehicleConfiguratorDto,
  VehicleInspectionReportDto,
  VehicleMarketListingDto,
  VehicleMarketValuationDto
} from "../../contracts/dto/VehicleMarketDto.js";
import type {
  CompanyId,
  VehicleDealerId,
  VehicleListingId,
  VehicleVariantId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleListingKind } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleOptionDefinition } from "../../domain/vehicle-market/VehicleOptionDefinition.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import type { VehicleMarketValuationService } from "./VehicleMarketValuationService.js";

export class VehicleMarketProjection {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly valuation: VehicleMarketValuationService
  ) {}

  listings(
    currentGameSecond: GameSecond,
    listingKind: VehicleListingKind | null,
    viewerCompanyId?: CompanyId
  ): readonly VehicleMarketListingDto[] {
    const result: VehicleMarketListingDto[] = [];

    for (const listing of this.repositories.vehicleMarket.findAvailableListings()) {
      if (
        listing.status !== "available" ||
        listing.stockCount <= 0 ||
        Number(listing.availableFromGameSecond) >
          Number(currentGameSecond) ||
        (
          listing.expiresAtGameSecond !== null &&
          Number(listing.expiresAtGameSecond) <
            Number(currentGameSecond)
        ) ||
        (listingKind !== null && listing.kind !== listingKind)
      ) {
        continue;
      }

      const dealer =
        this.repositories.vehicleMarket.getDealer(listing.dealerId);
      const variant =
        this.repositories.vehicleMarket.getVariant(listing.variantId);
      const identity =
        this.repositories.vehicleMarket.getModelIdentity(listing.modelId);
      const series = identity
        ? this.repositories.vehicleMarket.getSeries(identity.seriesId)
        : undefined;
      const brand = series
        ? this.repositories.vehicleMarket.getBrand(series.brandId)
        : undefined;
      const configuration =
        listing.configurationId === null
          ? undefined
          : this.repositories.vehicleMarket.getConfiguration(
              listing.configurationId
            );

      if (!dealer || !variant || !identity || !series || !brand) {
        continue;
      }

      const reservation =
        listing.reservation !== null &&
        Number(listing.reservation.expiresAtGameSecond) >
          Number(currentGameSecond)
          ? listing.reservation
          : null;

      const auction = this.repositories.vehicleMarket
        .findAuctions()
        .find(
          (value) =>
            value.listingId === listing.id &&
            (value.status === "scheduled" || value.status === "open")
        );

      const disclosure = listing.sellerDisclosure;
      const used = listing.usedSnapshot;

      result.push({
        listingId: listing.id,
        listingKind: listing.kind,
        dealerId: dealer.id,
        dealerName: dealer.name,
        dealerKind: dealer.kind,
        brandName: brand.name,
        seriesName: series.name,
        modelId: listing.modelId,
        modelName: identity.displayName,
        variantId: variant.id,
        variantName: variant.name,
        modelYear: variant.modelYear,
        configurationId: configuration?.id ?? null,
        configurationName: configuration?.customName ?? null,
        askingPriceCents: Number(listing.askingPriceCents),
        stockCount: listing.stockCount,
        seatCapacity:
          configuration?.seatCapacity ??
          variant.standardSeatCapacity,
        energyCapacityUnits:
          configuration?.energyCapacityUnits ??
          variant.standardEnergyCapacityUnits,
        luggageCapacityL:
          configuration?.luggageCapacityL ??
          variant.standardLuggageCapacityL,
        comfortPermille:
          configuration?.comfortPermille ??
          variant.standardComfortPermille,
        reportedMileageM:
          disclosure !== null
            ? Number(disclosure.reportedMileageM)
            : used === null
              ? null
              : Number(used.mileageM),
        reportedConditionPermille:
          disclosure?.reportedConditionPermille === null ||
          disclosure?.reportedConditionPermille === undefined
            ? null
            : Number(disclosure.reportedConditionPermille),
        reportedAccidentCount:
          disclosure?.reportedAccidentCount ?? null,
        previousOwnerCount: used?.previousOwnerCount ?? null,
        reservationStatus:
          reservation === null
            ? "none"
            : reservation.buyerCompanyId === viewerCompanyId
              ? "reserved_for_you"
              : "reserved_for_other",
        yourAgreedPriceCents:
          reservation !== null &&
          reservation.buyerCompanyId === viewerCompanyId
            ? Number(reservation.agreedPriceCents)
            : null,
        auctionId: auction?.id ?? null,
        auctionStatus: auction?.status ?? null,
        highestBidCents:
          auction?.highestBidCents === null ||
          auction?.highestBidCents === undefined
            ? null
            : Number(auction.highestBidCents)
      });
    }

    return result.sort(
      (a, b) =>
        a.askingPriceCents - b.askingPriceCents ||
        String(a.listingId).localeCompare(String(b.listingId))
    );
  }

  valuationForOwnedVehicle(
    vehicleId: VehicleId,
    dealerId: VehicleDealerId,
    currentGameSecond: GameSecond
  ): VehicleMarketValuationDto | null {
    const result = this.valuation.estimateOwnedVehicle(
      vehicleId,
      dealerId,
      currentGameSecond
    );
    if (!result.ok) return null;
    return {
      fairMarketValueCents: Number(
        result.value.fairMarketValueCents
      ),
      dealerBuyOfferCents: Number(
        result.value.dealerBuyOfferCents
      ),
      suggestedAskingPriceCents: Number(
        result.value.suggestedAskingPriceCents
      )
    };
  }

  inspections(
    companyId: CompanyId,
    listingId: VehicleListingId
  ): readonly VehicleInspectionReportDto[] {
    return this.repositories.vehicleMarket
      .findInspectionReportsByListing(listingId)
      .filter(
        (report) => report.requestedByCompanyId === companyId
      )
      .sort(
        (a, b) =>
          Number(b.inspectedAtGameSecond) -
          Number(a.inspectedAtGameSecond)
      )
      .map((report) => ({
        inspectionReportId: report.id,
        listingId: report.listingId,
        level: report.level,
        inspectedAtGameSecond: Number(
          report.inspectedAtGameSecond
        ),
        costCents: Number(report.costCents),
        mileageVerified: report.mileageVerified,
        verifiedMileageM: report.verifiedMileageM,
        mechanicalConditionPermille: Number(
          report.mechanicalConditionPermille
        ),
        bodyConditionPermille: Number(
          report.bodyConditionPermille
        ),
        accidentEvidenceCount: report.accidentEvidenceCount,
        disclosureMismatch: report.disclosureMismatch
      }));
  }

  auctions(
    companyId: CompanyId
  ): readonly VehicleAuctionDto[] {
    return this.repositories.vehicleMarket
      .findAuctions()
      .map((auction) => ({
        auctionId: auction.id,
        listingId: auction.listingId,
        sellerCompanyId: auction.sellerCompanyId,
        startsAtGameSecond: Number(auction.startsAtGameSecond),
        endsAtGameSecond: Number(auction.endsAtGameSecond),
        reservePriceCents:
          auction.sellerCompanyId === companyId
            ? Number(auction.reservePriceCents)
            : null,
        highestBidCents:
          auction.highestBidCents === null
            ? null
            : Number(auction.highestBidCents),
        highestBidderCompanyId:
          auction.highestBidderCompanyId,
        status: auction.status
      }))
      .sort(
        (a, b) =>
          a.endsAtGameSecond - b.endsAtGameSecond ||
          String(a.auctionId).localeCompare(String(b.auctionId))
      );
  }

  configurator(
    variantId: VehicleVariantId
  ): VehicleConfiguratorDto | null {
    const variant =
      this.repositories.vehicleMarket.getVariant(variantId);
    if (!variant || !variant.active) return null;

    const options: VehicleOptionDefinition[] = [];
    for (const code of variant.allowedOptionCodes) {
      const option = this.repositories.vehicleMarket.getOption(code);
      if (option?.active) options.push(option);
    }

    return {
      variantId: variant.id,
      variantName: variant.name,
      modelId: variant.modelId,
      modelYear: variant.modelYear,
      basePriceCents: Number(variant.basePriceCents),
      standardSeatCapacity: variant.standardSeatCapacity,
      standardEnergyCapacityUnits:
        variant.standardEnergyCapacityUnits,
      standardLuggageCapacityL:
        variant.standardLuggageCapacityL,
      standardComfortPermille:
        variant.standardComfortPermille,
      options: options.map((option) => ({
        code: option.code,
        name: option.name,
        priceDeltaCents: Number(option.priceDeltaCents),
        seatCapacityDelta: option.seatCapacityDelta,
        energyCapacityUnitsDelta:
          option.energyCapacityUnitsDelta,
        luggageCapacityLDelta: option.luggageCapacityLDelta,
        comfortPermilleDelta: option.comfortPermilleDelta,
        mutuallyExclusiveGroup: option.mutuallyExclusiveGroup
      }))
    };
  }
}
