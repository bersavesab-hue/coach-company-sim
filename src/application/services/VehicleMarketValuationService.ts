import type {
  VehicleDealerId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import { units, type GameSecond, type MoneyCents } from "../../core/units/Units.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleDealer } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleMarketPolicy } from "../policies/VehicleMarketPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export interface VehicleMarketValuation {
  readonly fairMarketValueCents: MoneyCents;
  readonly dealerBuyOfferCents: MoneyCents;
  readonly suggestedAskingPriceCents: MoneyCents;
}

export class VehicleMarketValuationService {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly policy: VehicleMarketPolicy
  ) {}

  estimateOwnedVehicle(
    vehicleId: VehicleId,
    dealerId: VehicleDealerId,
    gameSecond: GameSecond
  ): Result<VehicleMarketValuation, DomainError> {
    const vehicle = this.repositories.vehicles.getById(vehicleId);
    const dealer = this.repositories.vehicleMarket.getDealer(dealerId);
    if (!vehicle || !dealer || !dealer.active) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle or dealer does not exist",
          { vehicleId, dealerId }
        )
      );
    }
    return this.estimatePhysicalVehicle(vehicle, dealer, gameSecond);
  }

  estimateListing(
    listing: VehicleListing,
    gameSecond: GameSecond
  ): Result<VehicleMarketValuation, DomainError> {
    const dealer = this.repositories.vehicleMarket.getDealer(
      listing.dealerId
    );
    const variant = this.repositories.vehicleMarket.getVariant(
      listing.variantId
    );
    if (!dealer || !dealer.active || !variant || !variant.active) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Listing valuation references an inactive dealer or variant",
          { listingId: listing.id }
        )
      );
    }

    const snapshot = listing.usedSnapshot;
    const base =
      Number(variant.basePriceCents) +
      (listing.configurationId === null
        ? 0
        : Number(
            this.repositories.vehicleMarket.getConfiguration(
              listing.configurationId
            )?.priceAdjustmentCents ?? 0
          ));

    if (listing.kind === "new" || snapshot === null) {
      const regional = this.policy.regionalDemandPermille(
        dealer.regionId,
        listing.modelId,
        gameSecond
      );
      return ok(
        fromFair(
          applyPermille(base, Number(regional)),
          dealer,
          this.policy
        )
      );
    }

    const ageDays = Math.max(
      0,
      Math.floor(
        (Number(gameSecond) -
          Number(snapshot.registeredAtGameSecond)) /
          SECONDS_PER_DAY
      )
    );

    let fair = base;
    fair = applyPermille(
      fair,
      Number(this.policy.ageValuePermille(ageDays))
    );
    fair = applyPermille(
      fair,
      Number(this.policy.mileageValuePermille(snapshot.mileageM))
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.conditionValuePermille(
          snapshot.powertrainConditionPermille,
          snapshot.brakeConditionPermille,
          snapshot.tireConditionPermille,
          snapshot.bodyConditionPermille
        )
      )
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.accidentValuePermille(
          snapshot.recordedAccidentCount
        )
      )
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.regionalDemandPermille(
          dealer.regionId,
          listing.modelId,
          gameSecond
        )
      )
    );

    return ok(fromFair(fair, dealer, this.policy));
  }

  private estimatePhysicalVehicle(
    vehicle: OwnedVehicle,
    dealer: VehicleDealer,
    gameSecond: GameSecond
  ): Result<VehicleMarketValuation, DomainError> {
    if (vehicle.configurationId === null) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Vehicle has no Stage 13 configuration and cannot enter the formal used market",
          { vehicleId: vehicle.id }
        )
      );
    }

    const configuration =
      this.repositories.vehicleMarket.getConfiguration(
        vehicle.configurationId
      );
    const variant = configuration
      ? this.repositories.vehicleMarket.getVariant(
          configuration.variantId
        )
      : undefined;
    if (!configuration || !variant || !configuration.active || !variant.active) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Vehicle configuration or variant is unavailable",
          { vehicleId: vehicle.id }
        )
      );
    }

    const base =
      Number(variant.basePriceCents) +
      Number(configuration.priceAdjustmentCents);
    const ageDays = Math.max(
      0,
      Math.floor(
        (Number(gameSecond) -
          Number(vehicle.registeredAtGameSecond)) /
          SECONDS_PER_DAY
      )
    );

    let fair = base;
    fair = applyPermille(
      fair,
      Number(this.policy.ageValuePermille(ageDays))
    );
    fair = applyPermille(
      fair,
      Number(this.policy.mileageValuePermille(vehicle.mileageM))
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.conditionValuePermille(
          vehicle.powertrainConditionPermille,
          vehicle.brakeConditionPermille,
          vehicle.tireConditionPermille,
          vehicle.bodyConditionPermille
        )
      )
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.accidentValuePermille(
          vehicle.recordedAccidentCount
        )
      )
    );
    fair = applyPermille(
      fair,
      Number(
        this.policy.regionalDemandPermille(
          dealer.regionId,
          vehicle.modelId,
          gameSecond
        )
      )
    );

    return ok(fromFair(fair, dealer, this.policy));
  }
}

function applyPermille(value: number, permille: number): number {
  return Math.max(0, Math.floor((value * permille) / 1000));
}

function fromFair(
  fair: number,
  dealer: VehicleDealer,
  policy: VehicleMarketPolicy
): VehicleMarketValuation {
  return {
    fairMarketValueCents: units.moneyCents(fair),
    dealerBuyOfferCents: units.moneyCents(
      applyPermille(
        fair,
        Number(policy.dealerBuyPermille(dealer.kind))
      )
    ),
    suggestedAskingPriceCents: units.moneyCents(
      applyPermille(
        fair,
        Number(policy.suggestedAskPermille(dealer.kind))
      )
    )
  };
}
