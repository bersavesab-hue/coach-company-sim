import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import { VEHICLE_VARIANTS } from "../../content/vehicle/VehicleVariantCatalog.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

type LifecycleRepositories = Pick<
  RepositoryBundle,
  "vehicleMarket"
>;

type LifecyclePhase = "normal" | "clearance";

export interface VehicleVariantLifecycleRefreshResult {
  readonly expiredUnavailableListings: number;
  readonly expiredPhaseChangedListings: number;
}

const LIFECYCLE_BY_VARIANT = new Map(
  VEHICLE_VARIANTS.map((record) => [
    String(record.variant.id),
    record.lifecycle
  ])
);

export class VehicleVariantLifecycleRefresher {
  constructor(
    private readonly repositories: LifecycleRepositories
  ) {}

  refresh(
    gameSecond: GameSecond
  ): VehicleVariantLifecycleRefreshResult {
    const gameDay =
      Math.floor(
        Number(gameSecond) / SECONDS_PER_DAY
      ) + 1;
    let expiredUnavailableListings = 0;
    let expiredPhaseChangedListings = 0;

    for (
      const listing of
        this.repositories.vehicleMarket.findListings()
    ) {
      if (
        listing.supplySource !== "generated_new" ||
        (
          listing.status !== "available" &&
          listing.status !== "reserved"
        )
      ) {
        continue;
      }

      const lifecycle = LIFECYCLE_BY_VARIANT.get(
        String(listing.variantId)
      );
      const currentPhase = lifecycle
        ? lifecyclePhase(
            lifecycle.launchGameDay,
            lifecycle.productionEndGameDay,
            lifecycle.dealerClearanceEndGameDay,
            gameDay
          )
        : null;

      if (currentPhase === null) {
        this.expire(listing);
        expiredUnavailableListings += 1;
        continue;
      }

      const listedPhase = listingLifecyclePhase(
        listing.supplyCycleKey
      );
      if (
        listedPhase !== null &&
        listedPhase !== currentPhase
      ) {
        this.expire(listing);
        expiredPhaseChangedListings += 1;
      }
    }

    return {
      expiredUnavailableListings,
      expiredPhaseChangedListings
    };
  }

  private expire(listing: VehicleListing): void {
    this.repositories.vehicleMarket.saveListing({
      ...listing,
      reservation: null,
      status: "expired"
    });
  }
}

function listingLifecyclePhase(
  supplyCycleKey: string | null | undefined
): LifecyclePhase | null {
  if (supplyCycleKey?.endsWith(":normal")) {
    return "normal";
  }
  if (supplyCycleKey?.endsWith(":clearance")) {
    return "clearance";
  }
  return null;
}

function lifecyclePhase(
  launchGameDay: number,
  productionEndGameDay: number | null,
  dealerClearanceEndGameDay: number | null,
  gameDay: number
): LifecyclePhase | null {
  if (gameDay < launchGameDay) return null;

  if (
    productionEndGameDay === null ||
    gameDay <= productionEndGameDay
  ) {
    return "normal";
  }

  if (
    dealerClearanceEndGameDay !== null &&
    gameDay <= dealerClearanceEndGameDay
  ) {
    return "clearance";
  }

  return null;
}
