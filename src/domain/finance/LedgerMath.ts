import type { FinanceAccount } from "./FinanceAccount.js";
import { normalSideForAccount } from "./FinanceAccount.js";
import type { LedgerEntry } from "./LedgerEntry.js";

export function accountBalanceCents(
  entries: readonly LedgerEntry[],
  account: FinanceAccount
): number {
  const normalSide = normalSideForAccount(account);
  let balance = 0;

  for (const entry of entries) {
    for (const posting of entry.postings) {
      if (posting.account !== account) continue;
      const amount = Number(posting.amountCents);
      balance += posting.side === normalSide ? amount : -amount;
    }
  }

  return balance;
}

export function debitTotalCents(
  entries: readonly LedgerEntry[],
  account: FinanceAccount
): number {
  return entries.reduce(
    (sum, entry) =>
      sum +
      entry.postings
        .filter(
          (posting) =>
            posting.account === account && posting.side === "debit"
        )
        .reduce((inner, posting) => inner + Number(posting.amountCents), 0),
    0
  );
}

export function creditTotalCents(
  entries: readonly LedgerEntry[],
  account: FinanceAccount
): number {
  return entries.reduce(
    (sum, entry) =>
      sum +
      entry.postings
        .filter(
          (posting) =>
            posting.account === account && posting.side === "credit"
        )
        .reduce((inner, posting) => inner + Number(posting.amountCents), 0),
    0
  );
}
