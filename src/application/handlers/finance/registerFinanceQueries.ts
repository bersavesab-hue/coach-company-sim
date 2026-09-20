import type {
  CompanyFinanceSnapshotDto,
  TripEconomicsDto
} from "../../../contracts/dto/FinanceDto.js";
import { ok } from "../../../core/result/Result.js";
import {
  accountBalanceCents,
  creditTotalCents,
  debitTotalCents
} from "../../../domain/finance/LedgerMath.js";
import type { FinanceAccount } from "../../../domain/finance/FinanceAccount.js";
import type { QueryBus } from "../../QueryBus.js";
import type {
  CompanyFinanceSnapshotQuery,
  TripEconomicsQuery
} from "../../queries/finance/FinanceQueries.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";

const EXPENSE_ACCOUNTS: readonly FinanceAccount[] = [
  "energy_expense",
  "road_toll_expense",
  "station_fee_expense",
  "driver_wage_expense",
  "employer_burden_expense",
  "insurance_expense",
  "vehicle_tax_expense",
  "station_lease_expense",
  "company_overhead_expense",
  "depreciation_expense"
];

const TRIP_EXPENSE_ACCOUNTS: readonly FinanceAccount[] = [
  "energy_expense",
  "road_toll_expense",
  "station_fee_expense",
  "driver_wage_expense",
  "employer_burden_expense"
];

export function registerFinanceQueries(
  queries: QueryBus,
  repositories: RepositoryBundle
): void {
  queries.register("finance.companySnapshot", (query) => {
    const typed = query as CompanyFinanceSnapshotQuery;
    const entries = repositories.finance.ledgerEntriesByCompany(
      typed.payload.companyId
    );

    const passengerRevenue = creditTotalCents(
      entries,
      "passenger_revenue"
    );
    const expenses = EXPENSE_ACCOUNTS.reduce(
      (sum, account) => sum + debitTotalCents(entries, account),
      0
    );

    const dto: CompanyFinanceSnapshotDto = {
      companyId: typed.payload.companyId,
      cashBalanceCents: accountBalanceCents(entries, "cash"),
      accountsPayableCents: accountBalanceCents(
        entries,
        "accounts_payable"
      ),
      payrollPayableCents: accountBalanceCents(
        entries,
        "payroll_payable"
      ),
      taxPayableCents: accountBalanceCents(entries, "tax_payable"),
      passengerRevenueCents: passengerRevenue,
      totalExpenseCents: expenses,
      accountingProfitCents: passengerRevenue - expenses,
      capitalInflowCents: entries
        .filter((entry) => entry.kind === "opening_capital")
        .reduce(
          (sum, entry) =>
            sum +
            entry.postings
              .filter(
                (posting) =>
                  posting.account === "cash" &&
                  posting.side === "debit"
              )
              .reduce(
                (inner, posting) =>
                  inner + Number(posting.amountCents),
                0
              ),
          0
        )
    };

    return ok(dto);
  });

  queries.register("finance.tripEconomics", (query) => {
    const typed = query as TripEconomicsQuery;
    const entries = repositories.finance.ledgerEntriesByTrip(
      typed.payload.tripId
    );
    const management =
      repositories.finance.managementCostsByTrip(
        typed.payload.tripId
      );

    const grossTicketSales = entries
      .filter((entry) => entry.kind === "ticket_sale")
      .reduce(
        (sum, entry) =>
          sum +
          entry.postings
            .filter(
              (posting) =>
                posting.account === "cash" &&
                posting.side === "debit"
            )
            .reduce(
              (inner, posting) =>
                inner + Number(posting.amountCents),
              0
            ),
        0
      );

    const netRevenue = creditTotalCents(
      entries,
      "passenger_revenue"
    );
    const tax = entries
      .filter((entry) => entry.kind === "ticket_sale")
      .reduce(
        (sum, entry) =>
          sum +
          entry.postings
            .filter(
              (posting) =>
                posting.account === "tax_payable" &&
                posting.side === "credit"
            )
            .reduce(
              (inner, posting) =>
                inner + Number(posting.amountCents),
              0
            ),
        0
      );

    const accountingVariableCost = TRIP_EXPENSE_ACCOUNTS.reduce(
      (sum, account) => sum + debitTotalCents(entries, account),
      0
    );

    const maintenance = management
      .filter((entry) => entry.category === "maintenance_wear")
      .reduce((sum, entry) => sum + Number(entry.amountCents), 0);
    const economicDepreciation = management
      .filter((entry) => entry.category === "economic_depreciation")
      .reduce((sum, entry) => sum + Number(entry.amountCents), 0);

    const dto: TripEconomicsDto = {
      tripId: typed.payload.tripId,
      grossTicketSalesCents: grossTicketSales,
      netPassengerRevenueCents: netRevenue,
      ticketTaxCents: tax,
      accountingVariableCostCents: accountingVariableCost,
      maintenanceEconomicCostCents: maintenance,
      economicDepreciationCents: economicDepreciation,
      contributionProfitCents:
        netRevenue -
        accountingVariableCost -
        maintenance -
        economicDepreciation
    };

    return ok(dto);
  });
}
