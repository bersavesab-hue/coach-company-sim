import {
  ids,
  type VehicleBrandId,
  type VehicleDealerId,
  type VehicleModelId,
  type VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleConfiguration } from "../../domain/vehicle-market/VehicleConfiguration.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import {
  quoteVehicleMarketDemand,
  vehicleMarketDemandPricePermille
} from "../services/VehicleMarketDemandService.js";
import type {
  VehicleMarketZoneCode
} from "../../content/vehicle/VehicleContentTypes.js";
import { VEHICLE_DEALERS } from "../../content/vehicle/VehicleDealerCatalog.js";
import { VEHICLE_MODELS } from "../../content/vehicle/VehicleModelCatalog.js";
import { VEHICLE_SERIES } from "../../content/vehicle/VehicleSeriesCatalog.js";
import { VEHICLE_VARIANTS } from "../../content/vehicle/VehicleVariantCatalog.js";

const STOCK_CYCLE_DAYS = 7;
const STOCK_CYCLE_SECONDS =
  STOCK_CYCLE_DAYS * SECONDS_PER_DAY;

type StockRepositories = Pick<
  RepositoryBundle,
  "vehicleMarket" | "vehicleModels"
>;

type LifecyclePhase = "normal" | "clearance";

interface Candidate {
  readonly dealerId: VehicleDealerId;
  readonly variantId: VehicleVariantId;
  readonly modelId: VehicleModelId;
  readonly brandId: VehicleBrandId;
  readonly phase: LifecyclePhase;
  readonly score: number;
  readonly marketDemandPermille: number;
}

export interface NewVehicleStockRefreshResult {
  readonly cycleKey: number;
  readonly generatedListings: number;
  readonly normalListings: number;
  readonly clearanceListings: number;
  readonly skippedMissingRuntimeContent: number;
}

const SERIES_BY_ID = new Map(
  VEHICLE_SERIES.map((record) => [
    String(record.series.id),
    record.series
  ])
);

const MODEL_BY_ID = new Map(
  VEHICLE_MODELS.map((record) => [
    String(record.model.id),
    record
  ])
);

export class NewVehicleStockGenerator {
  constructor(
    private readonly repositories: StockRepositories
  ) {}

  refresh(
    gameSecond: GameSecond
  ): NewVehicleStockRefreshResult {
    const cycleKey = stockCycleKey(gameSecond);
    const gameDay =
      Math.floor(Number(gameSecond) / SECONDS_PER_DAY) + 1;

    let generatedListings = 0;
    let normalListings = 0;
    let clearanceListings = 0;
    let skippedMissingRuntimeContent = 0;

    for (const dealerRecord of VEHICLE_DEALERS) {
      const dealer = dealerRecord.dealer;
      if (
        dealer.kind !== "manufacturer_dealer" &&
        dealer.kind !== "regional_dealer"
      ) {
        continue;
      }

      const runtimeDealer =
        this.repositories.vehicleMarket.getDealer(dealer.id);
      if (!runtimeDealer || !runtimeDealer.active) {
        skippedMissingRuntimeContent += 1;
        continue;
      }

      const candidates = this.candidatesForDealer(
        dealer.id,
        dealer.supportedBrandIds,
        gameDay,
        cycleKey,
        dealerRecord.marketZoneCode
      );
      const targetCount = targetListingCount(
        dealer.kind,
        dealerRecord.newStockWeightPermille
      );

      for (const candidate of candidates.slice(0, targetCount)) {
        const listingId = generatedListingId(
          cycleKey,
          candidate.dealerId,
          candidate.variantId,
          candidate.phase
        );
        if (
          this.repositories.vehicleMarket.getListing(
            listingId
          )
        ) {
          continue;
        }

        const runtimeVariant =
          this.repositories.vehicleMarket.getVariant(
            candidate.variantId
          );
        const runtimeModel =
          this.repositories.vehicleModels.getById(
            candidate.modelId
          );
        const runtimeIdentity =
          this.repositories.vehicleMarket.getModelIdentity(
            candidate.modelId
          );
        if (
          !runtimeVariant ||
          !runtimeVariant.active ||
          !runtimeModel ||
          !runtimeModel.active ||
          !runtimeIdentity
        ) {
          skippedMissingRuntimeContent += 1;
          continue;
        }

        const configuration =
          this.ensureStandardConfiguration(
            candidate.variantId
          );
        if (!configuration) {
          skippedMissingRuntimeContent += 1;
          continue;
        }

        const variantRecord = VEHICLE_VARIANTS.find(
          (record) =>
            record.variant.id === candidate.variantId
        );
        if (!variantRecord) continue;

        const cycleStart =
          cycleKey * STOCK_CYCLE_SECONDS;
        const cycleEnd =
          cycleStart + STOCK_CYCLE_SECONDS - 1;
        const askingPriceCents = calculateAskingPriceCents(
          Number(runtimeVariant.basePriceCents),
          dealerRecord.priceBiasPermille,
          candidate.phase,
          candidate.score,
          candidate.marketDemandPermille
        );
        const stockCount = calculateStockCount(
          dealerRecord.newStockWeightPermille,
          candidate.phase,
          candidate.score,
          candidate.marketDemandPermille
        );

        const listing: VehicleListing = {
          id: listingId,
          dealerId: dealer.id,
          kind: "new",
          modelId: candidate.modelId,
          variantId: candidate.variantId,
          configurationId: configuration.id,
          sellerCompanyId: null,
          sourceVehicleId: null,
          askingPriceCents: units.moneyCents(
            askingPriceCents
          ),
          sellerDisclosure: null,
          reservation: null,
          stockCount,
          usedSnapshot: null,
          listedAtGameSecond: units.gameSecond(
            cycleStart
          ),
          availableFromGameSecond: units.gameSecond(
            cycleStart
          ),
          expiresAtGameSecond: units.gameSecond(
            cycleEnd
          ),
          status: "available",
          supplySource: "generated_new",
          supplyCycleKey: `${cycleKey}:${candidate.phase}`
        };

        this.repositories.vehicleMarket.saveListing(
          listing
        );
        generatedListings += 1;
        if (candidate.phase === "clearance") {
          clearanceListings += 1;
        } else {
          normalListings += 1;
        }
      }
    }

    return {
      cycleKey,
      generatedListings,
      normalListings,
      clearanceListings,
      skippedMissingRuntimeContent
    };
  }

  private candidatesForDealer(
    dealerId: VehicleDealerId,
    supportedBrandIds: readonly VehicleBrandId[],
    gameDay: number,
    cycleKey: number,
    marketZoneCode: VehicleMarketZoneCode | null
  ): readonly Candidate[] {
    const supported = new Set(
      supportedBrandIds.map(String)
    );
    const candidates: Candidate[] = [];

    for (const record of VEHICLE_VARIANTS) {
      const model = MODEL_BY_ID.get(
        String(record.variant.modelId)
      );
      if (!model) continue;

      const series = SERIES_BY_ID.get(
        String(model.identity.seriesId)
      );
      if (
        !series ||
        !supported.has(String(series.brandId))
      ) {
        continue;
      }

      const phase = lifecyclePhase(
        record.lifecycle.launchGameDay,
        record.lifecycle.productionEndGameDay,
        record.lifecycle.dealerClearanceEndGameDay,
        gameDay
      );
      if (phase === null) continue;

      const runtimeVariant =
        this.repositories.vehicleMarket.getVariant(
          record.variant.id
        );
      if (!runtimeVariant?.active) continue;

      const demand = quoteVehicleMarketDemand({
        zoneCode: marketZoneCode,
        role: model.metadata.role,
        energyKind: model.model.energyKind,
        basePriceCents: Number(
          record.variant.basePriceCents
        )
      });

      candidates.push({
        dealerId,
        variantId: record.variant.id,
        modelId: record.variant.modelId,
        brandId: series.brandId,
        phase,
        score: deterministicHash(
          `${cycleKey}|${dealerId}|${record.variant.id}`
        ),
        marketDemandPermille:
          demand.combinedDemandPermille
      });
    }

    return candidates.sort((a, b) => {
      const phaseBias =
        Number(b.phase === "clearance") -
        Number(a.phase === "clearance");
      return (
        phaseBias ||
        b.score * b.marketDemandPermille -
          a.score * a.marketDemandPermille ||
        String(a.variantId).localeCompare(
          String(b.variantId)
        )
      );
    });
  }

  private ensureStandardConfiguration(
    variantId: VehicleVariantId
  ): VehicleConfiguration | null {
    const id = standardConfigurationId(variantId);
    const existing =
      this.repositories.vehicleMarket.getConfiguration(id);
    if (existing) return existing;

    const variant =
      this.repositories.vehicleMarket.getVariant(variantId);
    if (!variant || !variant.active) return null;

    const configuration: VehicleConfiguration = {
      id,
      variantId,
      createdByCompanyId: null,
      customName: "厂家标准配置",
      selectedOptionCodes: [],
      seatCapacity: variant.standardSeatCapacity,
      energyCapacityUnits:
        variant.standardEnergyCapacityUnits,
      luggageCapacityL:
        variant.standardLuggageCapacityL,
      comfortPermille:
        variant.standardComfortPermille,
      priceAdjustmentCents: units.moneyCents(0),
      exteriorColorCode: null,
      liveryCode: null,
      active: true
    };

    this.repositories.vehicleMarket.saveConfiguration(
      configuration
    );
    return configuration;
  }
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

function targetListingCount(
  kind: "manufacturer_dealer" | "regional_dealer",
  weightPermille: number
): number {
  const base = kind === "manufacturer_dealer" ? 10 : 7;
  return Math.max(
    2,
    Math.min(
      18,
      Math.round((base * weightPermille) / 1000)
    )
  );
}

function calculateStockCount(
  weightPermille: number,
  phase: LifecyclePhase,
  score: number,
  marketDemandPermille: number
): number {
  if (phase === "clearance") return 1;

  const base = 1 + (score % 4);
  return Math.max(
    1,
    Math.min(
      8,
      Math.round(
        (
          base *
          weightPermille *
          marketDemandPermille
        ) /
          1_000_000
      )
    )
  );
}

function calculateAskingPriceCents(
  basePriceCents: number,
  dealerBiasPermille: number,
  phase: LifecyclePhase,
  score: number,
  marketDemandPermille: number
): number {
  const cycleMarketPermille =
    970 + (score % 61);
  const lifecyclePermille =
    phase === "clearance" ? 900 : 1000;
  const demandPricePermille =
    vehicleMarketDemandPricePermille(
      marketDemandPermille
    );

  return Math.max(
    1,
    Math.round(
      (
        basePriceCents *
        dealerBiasPermille *
        cycleMarketPermille *
        lifecyclePermille *
        demandPricePermille
      ) /
      1_000_000_000_000
    )
  );
}

function stockCycleKey(
  gameSecond: GameSecond
): number {
  return Math.floor(
    Number(gameSecond) / STOCK_CYCLE_SECONDS
  );
}

function generatedListingId(
  cycleKey: number,
  dealerId: VehicleDealerId,
  variantId: VehicleVariantId,
  phase: LifecyclePhase
) {
  return ids.vehicleListing(
    `vehicle_listing.auto_new.${cycleKey}.${phase}.${safeSuffix(
      String(dealerId)
    )}.${safeSuffix(String(variantId))}`
  );
}

function standardConfigurationId(
  variantId: VehicleVariantId
) {
  return ids.vehicleConfiguration(
    `vehicle_configuration.stock.${safeSuffix(
      String(variantId)
    )}`
  );
}

function safeSuffix(value: string): string {
  return value.replace(
    /[^a-zA-Z0-9_.-]/g,
    "_"
  );
}

function deterministicHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
