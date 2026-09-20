export type FinanceAccount =
  | "cash"
  | "accounts_receivable"
  | "accounts_payable"
  | "payroll_payable"
  | "tax_payable"
  | "equity_capital"
  | "passenger_revenue"
  | "energy_expense"
  | "road_toll_expense"
  | "station_fee_expense"
  | "driver_wage_expense"
  | "employer_burden_expense"
  | "insurance_expense"
  | "vehicle_tax_expense"
  | "station_lease_expense"
  | "company_overhead_expense"
  | "depreciation_expense"
  | "accumulated_depreciation";

export type AccountNormalSide = "debit" | "credit";

export function normalSideForAccount(
  account: FinanceAccount
): AccountNormalSide {
  switch (account) {
    case "cash":
    case "accounts_receivable":
    case "energy_expense":
    case "road_toll_expense":
    case "station_fee_expense":
    case "driver_wage_expense":
    case "employer_burden_expense":
    case "insurance_expense":
    case "vehicle_tax_expense":
    case "station_lease_expense":
    case "company_overhead_expense":
    case "depreciation_expense":
      return "debit";
    default:
      return "credit";
  }
}
