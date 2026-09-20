import type {
  RegionId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import type {
  DistanceM,
  GameSecond,
  MoneyCents,
  Permille
} from "../../core/units/Units.js";
import type { VehicleDealerKind } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleInspectionLevel } from "../../domain/vehicle-market/VehicleInspectionReport.js";

export interface VehicleMarketPolicy {
  ageValuePermille(ageDays: number): Permille;
  mileageValuePermille(mileageM: DistanceM): Permille;
  conditionValuePermille(
    powertrainPermille: Permille,
    brakePermille: Permille,
    tirePermille: Permille,
    bodyPermille: Permille
  ): Permille;
  accidentValuePermille(accidentCount: number): Permille;
  regionalDemandPermille(
    regionId: RegionId | null,
    modelId: VehicleModelId,
    gameSecond: GameSecond
  ): Permille;
  dealerBuyPermille(kind: VehicleDealerKind): Permille;
  suggestedAskPermille(kind: VehicleDealerKind): Permille;
  negotiationFloorPermille(kind: VehicleDealerKind): Permille;
  listingFeeCents(kind: VehicleDealerKind): MoneyCents;
  inspectionCostCents(level: VehicleInspectionLevel): MoneyCents;
  negotiationReservationSeconds(): number;
  auctionMinimumIncrementCents(
    currentHighestBidCents: MoneyCents | null
  ): MoneyCents;
  auctionSellerFeePermille(): Permille;
}
