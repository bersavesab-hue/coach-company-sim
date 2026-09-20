import type {
  CompanyId,
  VehicleAuctionId,
  VehicleListingId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents
} from "../../core/units/Units.js";

export type VehicleAuctionStatus =
  | "scheduled"
  | "open"
  | "won"
  | "no_sale"
  | "cancelled";

export interface VehicleAuction {
  readonly id: VehicleAuctionId;
  readonly listingId: VehicleListingId;
  readonly sellerCompanyId: CompanyId;
  readonly startsAtGameSecond: GameSecond;
  readonly endsAtGameSecond: GameSecond;
  readonly reservePriceCents: MoneyCents;
  readonly highestBidCents: MoneyCents | null;
  readonly highestBidderCompanyId: CompanyId | null;
  readonly status: VehicleAuctionStatus;
}
