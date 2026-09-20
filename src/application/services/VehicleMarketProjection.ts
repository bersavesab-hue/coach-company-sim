import type {
  VehicleConfiguratorDto,
  VehicleMarketListingDto
} from "../../contracts/dto/VehicleMarketDto.js";
import type { VehicleVariantId } from "../../contracts/ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleListingKind } from "../../domain/vehicle-market/VehicleListing.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export class VehicleMarketProjection {
  constructor(
    private readonly repositories: RepositoryBundle
  ) {}

  listings(
    currentGameSecond: GameSecond,
    listingKind: VehicleListingKind | null
  ): readonly VehicleMarketListingDto[] {
    return this.repositories.vehicleMarket
      .findAvailableListings()
      .filter(
        (listing) =>
          listing.status === "available" &&
          listing.stockCount > 0 &&
          Number(listing.availableFromGameSecond) <=
            Number(currentGameSecond) &&
          (
            listing.expiresAtGameSecond === null ||
            Number(listing.expiresAtGameSecond) >=
              Number(currentGameSecond)
          ) &&
          (listingKind === null || listing.kind === listingKind)
      )
      .map((listing) => {
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
          return null;
        }

        return {
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
          configurationName:
            configuration?.customName ?? null,
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
          mileageM:
            listing.usedSnapshot === null
              ? null
              : Number(listing.usedSnapshot.mileageM),
          powertrainConditionPermille:
            listing.usedSnapshot === null
              ? null
              : Number(
                  listing.usedSnapshot.powertrainConditionPermille
                ),
          brakeConditionPermille:
            listing.usedSnapshot === null
              ? null
              : Number(listing.usedSnapshot.brakeConditionPermille),
          tireConditionPermille:
            listing.usedSnapshot === null
              ? null
              : Number(listing.usedSnapshot.tireConditionPermille),
          bodyConditionPermille:
            listing.usedSnapshot === null
              ? null
              : Number(listing.usedSnapshot.bodyConditionPermille),
          previousOwnerCount:
            listing.usedSnapshot?.previousOwnerCount ?? null,
          recordedAccidentCount:
            listing.usedSnapshot?.recordedAccidentCount ?? null
        } satisfies VehicleMarketListingDto;
      })
      .filter(
        (value): value is VehicleMarketListingDto =>
          value !== null
      )
      .sort(
        (a, b) =>
          a.askingPriceCents - b.askingPriceCents ||
          String(a.listingId).localeCompare(String(b.listingId))
      );
  }

  configurator(
    variantId: VehicleVariantId
  ): VehicleConfiguratorDto | null {
    const variant =
      this.repositories.vehicleMarket.getVariant(variantId);
    if (!variant || !variant.active) return null;

    const options = variant.allowedOptionCodes
      .map((code) =>
        this.repositories.vehicleMarket.getOption(code)
      )
      .filter(
        (option) => option !== undefined && option.active
      )
      .map((option) => ({
        code: option.code,
        name: option.name,
        priceDeltaCents: Number(option.priceDeltaCents),
        seatCapacityDelta: option.seatCapacityDelta,
        energyCapacityUnitsDelta:
          option.energyCapacityUnitsDelta,
        luggageCapacityLDelta: option.luggageCapacityLDelta,
        comfortPermilleDelta: option.comfortPermilleDelta,
        mutuallyExclusiveGroup: option.mutuallyExclusiveGroup
      }));

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
      options
    };
  }
}
