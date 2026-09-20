import type {
  CompanyId,
  TripId
} from "../ids/EntityIds.js";

export interface CompanyFinanceSnapshotDto {
  readonly companyId: CompanyId;
  readonly cashBalanceCents: number;
  readonly accountsReceivableCents: number;
  readonly accountsPayableCents: number;
  readonly payrollPayableCents: number;
  readonly taxPayableCents: number;
  readonly energyInventoryCents: number;
  readonly vehicleAssetNetCents: number;
  readonly totalAssetsCents: number;
  readonly passengerRevenueCents: number;
  readonly disposalGainCents: number;
  readonly totalExpenseCents: number;
  readonly accountingProfitCents: number;
  readonly capitalInflowCents: number;
}

export interface TripEconomicsDto {
  readonly tripId: TripId;
  readonly grossTicketSalesCents: number;
  readonly netPassengerRevenueCents: number;
  readonly ticketTaxCents: number;
  readonly accountingVariableCostCents: number;
  readonly maintenanceEconomicCostCents: number;
  readonly economicDepreciationCents: number;
  readonly contributionProfitCents: number;
}
