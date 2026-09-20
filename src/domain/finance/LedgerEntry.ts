import type {
  CompanyId,
  EventId,
  FinanceEntryId,
  TripId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents
} from "../../core/units/Units.js";
import type { FinanceAccount } from "./FinanceAccount.js";

export type LedgerSide = "debit" | "credit";

export type FinanceEntryKind =
  | "opening_capital"
  | "ticket_sale"
  | "energy_cost"
  | "road_toll"
  | "station_usage"
  | "driver_allowance"
  | "driver_base_wage"
  | "insurance"
  | "vehicle_tax"
  | "station_lease"
  | "company_overhead"
  | "depreciation"
  | "liability_settlement";

export interface LedgerPosting {
  readonly account: FinanceAccount;
  readonly side: LedgerSide;
  readonly amountCents: MoneyCents;
}

export interface LedgerEntry {
  readonly id: FinanceEntryId;
  readonly companyId: CompanyId;
  readonly gameSecond: GameSecond;
  readonly kind: FinanceEntryKind;
  readonly sourceRef: string;
  readonly sourceEventId: EventId | null;
  readonly tripId: TripId | null;
  readonly memo: string;
  readonly postings: readonly LedgerPosting[];
}

export function assertBalancedLedgerEntry(entry: LedgerEntry): void {
  const debit = entry.postings
    .filter((posting) => posting.side === "debit")
    .reduce((sum, posting) => sum + Number(posting.amountCents), 0);
  const credit = entry.postings
    .filter((posting) => posting.side === "credit")
    .reduce((sum, posting) => sum + Number(posting.amountCents), 0);

  if (entry.postings.length < 2 || debit <= 0 || debit !== credit) {
    throw new Error(
      `Ledger entry must balance with positive debits/credits: ${entry.sourceRef}`
    );
  }
}
