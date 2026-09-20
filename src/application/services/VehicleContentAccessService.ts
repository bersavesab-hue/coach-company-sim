import type {
  CompanyId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import type { GameSecond } from "../../core/units/Units.js";
import { VEHICLE_SERIES } from "../../content/vehicle/VehicleSeriesCatalog.js";
import { VEHICLE_MODELS } from "../../content/vehicle/VehicleModelCatalog.js";
import {
  evaluateVehicleUnlock,
  vehicleUnlockRuleForTier
} from "../../content/vehicle/VehicleUnlockRules.js";
import type {
  VehicleUnlockEvaluation,
  VehicleUnlockContext
} from "../../content/vehicle/VehicleUnlockRules.js";
import type {
  VehicleUnlockTier
} from "../../content/vehicle/VehicleContentTypes.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export interface VehicleModelAccessEvaluation
  extends VehicleUnlockEvaluation {
  readonly tier: VehicleUnlockTier;
}

const SERIES_BY_ID = new Map(
  VEHICLE_SERIES.map((record) => [
    String(record.series.id),
    record
  ])
);

const MODEL_BY_ID = new Map(
  VEHICLE_MODELS.map((record) => [
    String(record.model.id),
    record
  ])
);

export class VehicleContentAccessService {
  constructor(
    private readonly repositories: RepositoryBundle
  ) {}

  tierForModel(modelId: VehicleModelId): VehicleUnlockTier {
    const modelContent = MODEL_BY_ID.get(String(modelId));
    if (modelContent) return modelContent.metadata.unlock.tier;

    const identity =
      this.repositories.vehicleMarket.getModelIdentity(modelId);
    if (!identity) return 1;

    const content = SERIES_BY_ID.get(String(identity.seriesId));
    return content?.baseUnlockTier ?? 1;
  }

  evaluateModel(
    companyId: CompanyId,
    modelId: VehicleModelId,
    gameSecond: GameSecond
  ): VehicleModelAccessEvaluation {
    const company = this.repositories.companies.getById(companyId);
    const tier = this.tierForModel(modelId);

    if (!company || company.status !== "active") {
      return {
        tier,
        unlocked: false,
        missing: ["reputation"]
      };
    }

    const gameDay =
      Math.floor(Number(gameSecond) / SECONDS_PER_DAY) + 1;
    const ownedVehicleCount =
      this.repositories.vehicles
        .findByCompany(companyId)
        .filter(
          (vehicle) =>
            vehicle.status !== "sold" &&
            vehicle.status !== "retired"
        ).length;

    const context: VehicleUnlockContext = {
      company,
      gameDay,
      ownedVehicleCount
    };
    const modelContent = MODEL_BY_ID.get(String(modelId));
    const result = evaluateVehicleUnlock(
      modelContent?.metadata.unlock ??
        vehicleUnlockRuleForTier(tier),
      context
    );

    return {
      tier,
      ...result
    };
  }
}
