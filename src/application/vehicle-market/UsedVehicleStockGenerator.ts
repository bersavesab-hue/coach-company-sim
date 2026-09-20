import {
  ids,
  type VehicleBrandId,
  type VehicleDealerId,
  type VehicleModelId,
  type VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import {
  SECONDS_PER_DAY
} from "../../core/time/GameTime.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import {
  createVehicleConfiguration
} from "../../domain/vehicle-market/VehicleConfigurationRules.js";
import type {
  UsedVehicleDisclosure,
  UsedVehicleSnapshot,
  VehicleListing
} from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleConfiguration } from "../../domain/vehicle-market/VehicleConfiguration.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import type { VehicleMarketValuationService } from "../services/VehicleMarketValuationService.js";
import {
  VEHICLE_DEALERS
} from "../../content/vehicle/VehicleDealerCatalog.js";
import {
  VEHICLE_MODELS
} from "../../content/vehicle/VehicleModelCatalog.js";
import {
  VEHICLE_OPTIONS
} from "../../content/vehicle/VehicleOptionCatalog.js";
import {
  VEHICLE_SERIES
} from "../../content/vehicle/VehicleSeriesCatalog.js";
import {
  VEHICLE_VARIANTS
} from "../../content/vehicle/VehicleVariantCatalog.js";

const USED_STOCK_CYCLE_DAYS = 7;
const USED_STOCK_CYCLE_SECONDS =
  USED_STOCK_CYCLE_DAYS * SECONDS_PER_DAY;
const MINIMUM_USED_AGE_DAYS = 30;

type UsedStockRepositories = Pick<
  RepositoryBundle,
  "vehicleMarket" | "vehicleModels"
>;

interface UsedCandidate {
  readonly dealerId: VehicleDealerId;
  readonly variantId: VehicleVariantId;
  readonly modelId: VehicleModelId;
  readonly brandId: VehicleBrandId;
  readonly launchGameDay: number;
  readonly score: number;
}

export interface UsedVehicleStockRefreshResult {
  readonly cycleKey: number;
  readonly generatedListings: number;
  readonly regionalListings: number;
  readonly specialistUsedListings: number;
  readonly skippedTooNew: number;
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

const OPTION_BY_CODE = new Map(
  VEHICLE_OPTIONS.map((option) => [
    option.code,
    option
  ])
);

export class UsedVehicleStockGenerator {
  constructor(
    private readonly repositories: UsedStockRepositories,
    private readonly valuation: VehicleMarketValuationService
  ) {}

  refresh(
    gameSecond: GameSecond
  ): UsedVehicleStockRefreshResult {
    const cycleKey = usedStockCycleKey(gameSecond);
    const gameDay =
      Math.floor(Number(gameSecond) / SECONDS_PER_DAY) + 1;

    let generatedListings = 0;
    let regionalListings = 0;
    let specialistUsedListings = 0;
    let skippedTooNew = 0;
    let skippedMissingRuntimeContent = 0;

    for (const dealerRecord of VEHICLE_DEALERS) {
      const dealer = dealerRecord.dealer;
      if (
        dealer.kind !== "regional_dealer" &&
        dealer.kind !== "used_vehicle_dealer"
      ) {
        continue;
      }
      if (dealerRecord.usedSupplyWeightPermille <= 0) {
        continue;
      }

      const runtimeDealer =
        this.repositories.vehicleMarket.getDealer(dealer.id);
      if (!runtimeDealer || !runtimeDealer.active) {
        skippedMissingRuntimeContent += 1;
        continue;
      }

      const candidateResult = this.candidatesForDealer(
        dealer.id,
        dealer.supportedBrandIds,
        gameDay,
        cycleKey
      );
      skippedTooNew += candidateResult.skippedTooNew;

      const targetCount = targetUsedListingCount(
        dealer.kind,
        dealerRecord.usedSupplyWeightPermille
      );

      for (
        const candidate of candidateResult.candidates.slice(
          0,
          targetCount
        )
      ) {
        const listingId = generatedUsedListingId(
          cycleKey,
          candidate.dealerId,
          candidate.variantId
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

        const ageDays = usedAgeDays(
          candidate.launchGameDay,
          gameDay,
          candidate.score,
          dealerRecord.inventoryProfile
        );
        if (ageDays < MINIMUM_USED_AGE_DAYS) {
          skippedTooNew += 1;
          continue;
        }

        const configuration =
          this.ensureUsedConfiguration(
            candidate.variantId,
            listingId,
            candidate.score
          );
        if (!configuration) {
          skippedMissingRuntimeContent += 1;
          continue;
        }

        const snapshot = buildUsedSnapshot({
          gameSecond,
          ageDays,
          score: candidate.score,
          model: runtimeModel,
          configuration
        });
        const disclosure = buildSellerDisclosure(
          snapshot,
          candidate.score,
          dealerRecord.inventoryProfile
        );

        const cycleStart =
          cycleKey * USED_STOCK_CYCLE_SECONDS;
        const cycleEnd =
          cycleStart + USED_STOCK_CYCLE_SECONDS - 1;

        const provisional: VehicleListing = {
          id: listingId,
          dealerId: dealer.id,
          kind: "used",
          modelId: candidate.modelId,
          variantId: candidate.variantId,
          configurationId: configuration.id,
          sellerCompanyId: null,
          sourceVehicleId: null,
          askingPriceCents: units.moneyCents(
            Number(runtimeVariant.basePriceCents)
          ),
          sellerDisclosure: disclosure,
          reservation: null,
          stockCount: 1,
          usedSnapshot: snapshot,
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
          supplySource: "generated_used",
          supplyCycleKey: String(cycleKey)
        };

        const valuation =
          this.valuation.estimateListing(
            provisional,
            gameSecond
          );
        if (!valuation.ok) {
          skippedMissingRuntimeContent += 1;
          continue;
        }

        const askingPriceCents = Math.max(
          1,
          Math.round(
            (
              Number(
                valuation.value.suggestedAskingPriceCents
              ) *
              dealerRecord.priceBiasPermille *
              usedMarketNoisePermille(
                candidate.score
              )
            ) /
            1_000_000
          )
        );

        this.repositories.vehicleMarket.saveListing({
          ...provisional,
          askingPriceCents: units.moneyCents(
            askingPriceCents
          )
        });

        generatedListings += 1;
        if (dealer.kind === "regional_dealer") {
          regionalListings += 1;
        } else {
          specialistUsedListings += 1;
        }
      }
    }

    return {
      cycleKey,
      generatedListings,
      regionalListings,
      specialistUsedListings,
      skippedTooNew,
      skippedMissingRuntimeContent
    };
  }

  private candidatesForDealer(
    dealerId: VehicleDealerId,
    supportedBrandIds: readonly VehicleBrandId[],
    gameDay: number,
    cycleKey: number
  ): {
    readonly candidates: readonly UsedCandidate[];
    readonly skippedTooNew: number;
  } {
    const supported = new Set(
      supportedBrandIds.map(String)
    );
    const candidates: UsedCandidate[] = [];
    let skippedTooNew = 0;

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

      const maximumAgeDays =
        gameDay - record.lifecycle.launchGameDay;
      if (maximumAgeDays < MINIMUM_USED_AGE_DAYS) {
        skippedTooNew += 1;
        continue;
      }

      candidates.push({
        dealerId,
        variantId: record.variant.id,
        modelId: record.variant.modelId,
        brandId: series.brandId,
        launchGameDay: record.lifecycle.launchGameDay,
        score: deterministicHash(
          `${cycleKey}|${dealerId}|${record.variant.id}|used`
        )
      });
    }

    return {
      candidates: candidates.sort(
        (a, b) =>
          b.score - a.score ||
          String(a.variantId).localeCompare(
            String(b.variantId)
          )
      ),
      skippedTooNew
    };
  }

  private ensureUsedConfiguration(
    variantId: VehicleVariantId,
    listingId: VehicleListing["id"],
    score: number
  ): VehicleConfiguration | null {
    const configurationId =
      usedConfigurationId(listingId);
    const existing =
      this.repositories.vehicleMarket.getConfiguration(
        configurationId
      );
    if (existing) return existing;

    const variant =
      this.repositories.vehicleMarket.getVariant(
        variantId
      );
    if (!variant || !variant.active) return null;

    const allowedOptions = variant.allowedOptionCodes
      .map((code) => OPTION_BY_CODE.get(code))
      .filter(
        (
          option
        ): option is NonNullable<typeof option> =>
          option !== undefined && option.active
      );

    const selected = selectUsedOptions(
      allowedOptions,
      score
    );
    const created = createVehicleConfiguration({
      id: configurationId,
      variant,
      createdByCompanyId: null,
      customName: "二手原车配置",
      selectedOptions: selected,
      exteriorColorCode: usedExteriorColor(score),
      liveryCode: null
    });

    if (created.ok) {
      this.repositories.vehicleMarket.saveConfiguration(
        created.value
      );
      return created.value;
    }

    const fallback: VehicleConfiguration = {
      id: configurationId,
      variantId,
      createdByCompanyId: null,
      customName: "二手标准配置",
      selectedOptionCodes: [],
      seatCapacity: variant.standardSeatCapacity,
      energyCapacityUnits:
        variant.standardEnergyCapacityUnits,
      luggageCapacityL:
        variant.standardLuggageCapacityL,
      comfortPermille:
        variant.standardComfortPermille,
      priceAdjustmentCents: units.moneyCents(0),
      exteriorColorCode: usedExteriorColor(score),
      liveryCode: null,
      active: true
    };
    this.repositories.vehicleMarket.saveConfiguration(
      fallback
    );
    return fallback;
  }
}

function selectUsedOptions(
  allowedOptions: readonly (typeof VEHICLE_OPTIONS)[number][],
  score: number
) {
  const selected: (typeof VEHICLE_OPTIONS)[number][] = [];
  const groups = new Map<
    string,
    (typeof VEHICLE_OPTIONS)[number][]
  >();
  const stackable: (typeof VEHICLE_OPTIONS)[number][] = [];

  for (const option of allowedOptions) {
    if (option.mutuallyExclusiveGroup === null) {
      stackable.push(option);
      continue;
    }
    const group =
      groups.get(option.mutuallyExclusiveGroup) ?? [];
    group.push(option);
    groups.set(option.mutuallyExclusiveGroup, group);
  }

  let cursor = score;
  for (const options of groups.values()) {
    const choice =
      options[cursor % options.length];
    if (choice) selected.push(choice);
    cursor = rotateHash(cursor);
  }

  const stackCount = Math.min(
    3,
    stackable.length,
    1 + (cursor % 3)
  );
  const ordered = [...stackable].sort(
    (a, b) =>
      deterministicHash(`${score}|${a.code}`) -
      deterministicHash(`${score}|${b.code}`)
  );
  selected.push(...ordered.slice(0, stackCount));

  return selected;
}

function buildUsedSnapshot(input: {
  readonly gameSecond: GameSecond;
  readonly ageDays: number;
  readonly score: number;
  readonly model: NonNullable<
    ReturnType<RepositoryBundle["vehicleModels"]["getById"]>
  >;
  readonly configuration: VehicleConfiguration;
}): UsedVehicleSnapshot {
  const dailyKm = dailyMileageKm(
    input.model.serviceClass
  );
  const mileagePermille =
    700 + (input.score % 701);
  const mileageKm = Math.max(
    5_000,
    Math.round(
      (
        input.ageDays *
        dailyKm *
        mileagePermille
      ) / 1000
    )
  );
  const mileageM = mileageKm * 1000;

  const accidents = accidentCount(input.score);
  const ageWear = Math.floor(input.ageDays / 12);
  const mileageWear = Math.floor(mileageKm / 700);
  const baseCondition = clamp(
    1000 -
      ageWear -
      mileageWear -
      accidents * 65,
    360,
    970
  );

  const powertrain = clamp(
    baseCondition + signedVariation(input.score, 0, 45),
    320,
    990
  );
  const brake = clamp(
    baseCondition + signedVariation(input.score, 1, 65),
    300,
    990
  );
  const tire = clamp(
    baseCondition + signedVariation(input.score, 2, 85),
    280,
    990
  );
  const body = clamp(
    baseCondition -
      accidents * 25 +
      signedVariation(input.score, 3, 70),
    250,
    990
  );

  const interval = input.model.serviceIntervalM;
  const completedIntervals =
    Math.floor(mileageM / interval);
  const lastMaintenanceM = Math.max(
    0,
    completedIntervals * interval
  );
  const nextMaintenanceM =
    lastMaintenanceM + interval;

  const capacity =
    input.configuration.energyCapacityUnits;
  const energyPermille =
    180 + ((input.score >>> 5) % 721);
  const energyUnits = Math.max(
    0,
    Math.min(
      capacity,
      Math.round(
        (capacity * energyPermille) / 1000
      )
    )
  );

  const now = Number(input.gameSecond);
  const registeredAt = Math.max(
    0,
    now - input.ageDays * SECONDS_PER_DAY
  );
  const insuranceOffsetDays =
    -30 + ((input.score >>> 7) % 331);
  const inspectionOffsetDays =
    -45 + ((input.score >>> 11) % 411);

  return {
    mileageM: units.distanceM(mileageM),
    energyUnits,
    lastMaintenanceMileageM:
      units.distanceM(lastMaintenanceM),
    nextMaintenanceMileageM:
      units.distanceM(nextMaintenanceM),
    registeredAtGameSecond:
      units.gameSecond(registeredAt),
    insuranceValidUntilGameSecond:
      units.gameSecond(
        Math.max(
          0,
          now +
            insuranceOffsetDays *
              SECONDS_PER_DAY
        )
      ),
    inspectionValidUntilGameSecond:
      units.gameSecond(
        Math.max(
          0,
          now +
            inspectionOffsetDays *
              SECONDS_PER_DAY
        )
      ),
    powertrainConditionPermille:
      units.permille(powertrain),
    brakeConditionPermille:
      units.permille(brake),
    tireConditionPermille:
      units.permille(tire),
    bodyConditionPermille:
      units.permille(body),
    previousOwnerCount: clamp(
      1 +
        Math.floor(input.ageDays / 600) +
        ((input.score >>> 15) % 2),
      1,
      5
    ),
    recordedAccidentCount: accidents
  };
}

function buildSellerDisclosure(
  snapshot: UsedVehicleSnapshot,
  score: number,
  profile: string
): UsedVehicleDisclosure {
  const truthfulProfile =
    profile === "used_premium" ||
    profile === "used_import";
  const hidesOneAccident =
    !truthfulProfile &&
    snapshot.recordedAccidentCount > 0 &&
    ((score >>> 17) % 100) < 28;
  const actualCondition = Math.min(
    Number(snapshot.powertrainConditionPermille),
    Number(snapshot.brakeConditionPermille),
    Number(snapshot.tireConditionPermille),
    Number(snapshot.bodyConditionPermille)
  );
  const optimism =
    truthfulProfile
      ? 0
      : ((score >>> 19) % 46);

  return {
    reportedMileageM: snapshot.mileageM,
    reportedAccidentCount:
      hidesOneAccident
        ? snapshot.recordedAccidentCount - 1
        : snapshot.recordedAccidentCount,
    reportedConditionPermille:
      units.permille(
        clamp(
          actualCondition + optimism,
          0,
          1000
        )
      )
  };
}

function usedAgeDays(
  launchGameDay: number,
  gameDay: number,
  score: number,
  profile: string
): number {
  const maximumAge = Math.max(
    0,
    gameDay - launchGameDay
  );
  if (maximumAge < MINIMUM_USED_AGE_DAYS) {
    return maximumAge;
  }

  const desiredMaximum =
    profile === "used_premium"
      ? 900
      : profile === "used_import"
        ? 1200
        : profile === "used_budget"
          ? 2200
          : profile === "used_fleet"
            ? 2000
            : 1500;
  const cappedMaximum = Math.min(
    maximumAge,
    desiredMaximum
  );
  const span =
    cappedMaximum -
    MINIMUM_USED_AGE_DAYS +
    1;
  return (
    MINIMUM_USED_AGE_DAYS +
    (score % Math.max(1, span))
  );
}

function dailyMileageKm(serviceClass: string): number {
  switch (serviceClass) {
    case "rural_minibus":
      return 150;
    case "county_midibus":
      return 220;
    case "standard_coach":
      return 300;
    case "intercity_coach":
      return 430;
    case "premium_coach":
      return 360;
    case "tourist_coach":
      return 280;
    case "airport_shuttle":
      return 260;
    case "high_capacity_coach":
      return 500;
    default:
      return 260;
  }
}

function accidentCount(score: number): number {
  const roll = (score >>> 3) % 100;
  if (roll < 68) return 0;
  if (roll < 90) return 1;
  if (roll < 98) return 2;
  return 3;
}

function targetUsedListingCount(
  kind: "regional_dealer" | "used_vehicle_dealer",
  weightPermille: number
): number {
  const base =
    kind === "used_vehicle_dealer" ? 11 : 5;
  return Math.max(
    1,
    Math.min(
      20,
      Math.round(
        (base * weightPermille) / 1000
      )
    )
  );
}

function usedMarketNoisePermille(
  score: number
): number {
  return 970 + ((score >>> 9) % 61);
}

function usedStockCycleKey(
  gameSecond: GameSecond
): number {
  return Math.floor(
    Number(gameSecond) /
      USED_STOCK_CYCLE_SECONDS
  );
}

function generatedUsedListingId(
  cycleKey: number,
  dealerId: VehicleDealerId,
  variantId: VehicleVariantId
) {
  return ids.vehicleListing(
    `vehicle_listing.auto_used.${cycleKey}.${safeSuffix(
      String(dealerId)
    )}.${safeSuffix(String(variantId))}`
  );
}

function usedConfigurationId(
  listingId: VehicleListing["id"]
) {
  return ids.vehicleConfiguration(
    `vehicle_configuration.used.${safeSuffix(
      String(listingId)
    )}`
  );
}

function usedExteriorColor(score: number): string {
  const colors = [
    "fleet_white",
    "silver",
    "deep_blue",
    "charcoal",
    "champagne",
    "red"
  ] as const;
  return colors[score % colors.length] ?? "fleet_white";
}

function signedVariation(
  score: number,
  shift: number,
  magnitude: number
): number {
  const value =
    (rotateHash(score + shift * 7919) %
      (magnitude * 2 + 1)) -
    magnitude;
  return value;
}

function rotateHash(value: number): number {
  return (
    ((value << 13) | (value >>> 19)) >>>
    0
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

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}
