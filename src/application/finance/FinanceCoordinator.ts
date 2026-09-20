import type {
  CompanyId,
  EventId,
  RoadSegmentId,
  StaffId,
  StationId,
  TripId,
  VehicleId,
  VehicleModelId
} from "../../contracts/ids/EntityIds.js";
import { ids } from "../../contracts/ids/EntityIds.js";
import type { DomainEventEnvelope } from "../../contracts/events/DomainEventEnvelope.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import {
  units,
  type GameSecond,
  type MoneyCents
} from "../../core/units/Units.js";
import type { FinanceAccount } from "../../domain/finance/FinanceAccount.js";
import { calculateFareCents } from "../../domain/finance/FareCalculator.js";
import {
  accountBalanceCents,
  creditTotalCents
} from "../../domain/finance/LedgerMath.js";
import {
  assertBalancedLedgerEntry,
  type FinanceEntryKind,
  type LedgerEntry,
  type LedgerPosting
} from "../../domain/finance/LedgerEntry.js";
import type {
  DriverCompensationProfile,
  VehicleAssetProfile
} from "../../domain/finance/FinancialProfiles.js";
import type { ManagementCostCategory } from "../../domain/finance/ManagementCostEntry.js";
import type { EconomicPolicy } from "../../simulation/finance/EconomicPolicy.js";
import type { DomainEventBus } from "../events/DomainEventBus.js";
import { createSimulationDomainEvent } from "../events/createSimulationDomainEvent.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

interface BoardedEventPayload {
  readonly tripId: TripId;
  readonly stationId: StationId;
  readonly count: number;
  readonly boardedGroups: readonly {
    readonly destinationStationId: StationId;
    readonly count: number;
  }[];
}

interface ArrivedEventPayload {
  readonly tripId: TripId;
  readonly stationId: StationId;
}

interface OperatingIntervalPayload {
  readonly tripId: TripId;
  readonly vehicleId: VehicleId;
  readonly driverId: StaffId;
  readonly movingSeconds: number;
  readonly idleSeconds: number;
  readonly distanceTraveledM: number;
  readonly roadUsage: readonly {
    readonly roadSegmentId: RoadSegmentId;
    readonly distanceM: number;
  }[];
}

interface VehiclePurchasedPayload {
  readonly vehicleId: VehicleId;
  readonly companyId: CompanyId;
  readonly vehicleModelId: VehicleModelId;
  readonly purchasePriceCents: MoneyCents;
  readonly residualValueCents: MoneyCents;
  readonly usefulLifeDays: number;
  readonly dailyInsuranceCents: MoneyCents;
  readonly dailyVehicleTaxCents: MoneyCents;
}

interface VehicleEnergyPurchasedPayload {
  readonly vehicleId: VehicleId;
  readonly companyId: CompanyId;
  readonly energyUnits: number;
  readonly totalCostCents: MoneyCents;
}

interface VehicleEnergyConsumedPayload {
  readonly vehicleId: VehicleId;
  readonly tripId: TripId;
  readonly energyUnits: number;
}

interface VehicleCostPayload {
  readonly vehicleId: VehicleId;
  readonly companyId: CompanyId;
  readonly costCents: MoneyCents;
}

interface VehicleDisposalPayload {
  readonly vehicleId: VehicleId;
  readonly companyId: CompanyId;
  readonly proceedsCents: MoneyCents;
}

export class FinanceCoordinator {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly events: DomainEventBus,
    private readonly policy: EconomicPolicy
  ) {
    events.subscribe((event) => this.handleEvent(event));
  }

  initialize(): void {
    for (const profile of this.repositories.finance.companyFinancialProfiles()) {
      if (Number(profile.openingCapitalCents) <= 0) continue;

      this.postLedger({
        companyId: profile.companyId,
        gameSecond: units.gameSecond(0),
        kind: "opening_capital",
        sourceRef: `opening:${profile.companyId}`,
        sourceEventId: null,
        tripId: null,
        vehicleId: null,
        memo: "Opening capital",
        postings: [
          debit("cash", profile.openingCapitalCents),
          credit("equity_capital", profile.openingCapitalCents)
        ]
      });
    }
  }

  advanceTo(targetGameSecond: GameSecond): void {
    const completedDays = Math.floor(
      Number(targetGameSecond) / SECONDS_PER_DAY
    );
    const runtime = this.repositories.finance.getRuntimeState();

    for (const companyProfile of this.repositories.finance.companyFinancialProfiles()) {
      const companyId = companyProfile.companyId;
      const lastDay = runtime.lastFixedCostAccruedDay(companyId);

      for (let day = lastDay + 1; day <= completedDays; day += 1) {
        const gameSecond = units.gameSecond(day * SECONDS_PER_DAY);
        this.accrueCompanyDay(companyId, day, gameSecond);
        runtime.setLastFixedCostAccruedDay(companyId, day);
      }
    }

    this.repositories.finance.replaceRuntimeState(runtime);
    this.settleLiabilities(targetGameSecond);
  }

  private handleEvent(event: DomainEventEnvelope): void {
    switch (event.type) {
      case "passengers.boarded":
        this.postPassengerRevenue(
          event,
          event.payload as BoardedEventPayload
        );
        break;
      case "trip.departed":
        this.postDepartureStationFee(event);
        break;
      case "trip.arrivedAtStop":
        this.postArrivalStationFee(
          event,
          event.payload as ArrivedEventPayload
        );
        break;
      case "trip.operatingInterval":
        this.postOperatingInterval(
          event,
          event.payload as OperatingIntervalPayload
        );
        break;
      case "vehicle.purchased":
        this.postVehiclePurchase(
          event,
          event.payload as VehiclePurchasedPayload
        );
        break;
      case "vehicle.energyPurchased":
        this.postEnergyPurchase(
          event,
          event.payload as VehicleEnergyPurchasedPayload
        );
        break;
      case "vehicle.energyConsumed":
        this.postEnergyConsumption(
          event,
          event.payload as VehicleEnergyConsumedPayload
        );
        break;
      case "vehicle.maintenanceCompleted":
        this.postVehicleCost(
          event,
          event.payload as VehicleCostPayload,
          "maintenance",
          "maintenance_expense",
          "Vehicle maintenance"
        );
        break;
      case "vehicle.insuranceRenewed":
        this.postVehicleCost(
          event,
          event.payload as VehicleCostPayload,
          "insurance_renewal",
          "insurance_expense",
          "Insurance renewal"
        );
        break;
      case "vehicle.inspectionPassed":
        this.postVehicleCost(
          event,
          event.payload as VehicleCostPayload,
          "inspection",
          "inspection_expense",
          "Vehicle inspection"
        );
        break;
      case "vehicle.sold":
      case "vehicle.retired":
        this.postVehicleDisposal(
          event,
          event.payload as VehicleDisposalPayload
        );
        break;
    }
  }

  private postPassengerRevenue(
    event: DomainEventEnvelope,
    payload: BoardedEventPayload
  ): void {
    const trip = this.repositories.trips.getById(payload.tripId);
    if (!trip) return;

    const route = this.repositories.routes.getById(trip.routeId);
    if (!route) return;

    const farePolicy = this.repositories.finance.getFarePolicy(
      route.farePolicyId
    );
    if (!farePolicy) return;

    let grossFareCents = 0;

    for (const group of payload.boardedGroups) {
      const fare = calculateFareCents(
        route,
        payload.stationId,
        group.destinationStationId,
        this.repositories.world.get(),
        farePolicy
      );
      if (!fare.ok) continue;

      grossFareCents += Number(fare.value) * group.count;
    }

    if (grossFareCents > 0) {
      const gross = units.moneyCents(grossFareCents);
      const rawTax = this.policy.ticketTaxCents(
        gross,
        route.id,
        event.gameSecond
      );
      const tax = units.moneyCents(
        Math.min(grossFareCents, Number(rawTax))
      );
      const net = units.moneyCents(
        grossFareCents - Number(tax)
      );

      const postings: LedgerPosting[] = [debit("cash", gross)];
      if (Number(net) > 0) {
        postings.push(credit("passenger_revenue", net));
      }
      if (Number(tax) > 0) {
        postings.push(credit("tax_payable", tax));
      }

      this.postLedger({
        companyId: route.companyId,
        gameSecond: event.gameSecond,
        kind: "ticket_sale",
        sourceRef: `${event.eventId}:ticket`,
        sourceEventId: event.eventId,
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        memo: "Passenger ticket sales",
        postings
      });
    }

    const serviceFee = this.policy.stationPassengerServiceFeeCents(
      payload.stationId,
      payload.count,
      event.gameSecond
    );
    if (Number(serviceFee) > 0) {
      this.postExpensePayable(
        route.companyId,
        event.gameSecond,
        "station_usage",
        `${event.eventId}:passenger_service`,
        event.eventId,
        trip.id,
        trip.vehicleId,
        "station_fee_expense",
        serviceFee,
        "Station passenger service fee"
      );
    }
  }

  private postDepartureStationFee(event: DomainEventEnvelope): void {
    const tripId = event.aggregateId as TripId;
    const trip = this.repositories.trips.getById(tripId);
    if (!trip) return;

    const route = this.repositories.routes.getById(trip.routeId);
    const stationId = route?.stopPoints[0]?.stationId;
    if (!route || !stationId) return;

    const fee = this.policy.stationDepartureFeeCents(
      stationId,
      event.gameSecond
    );
    if (Number(fee) <= 0) return;

    this.postExpensePayable(
      route.companyId,
      event.gameSecond,
      "station_usage",
      `${event.eventId}:departure_station`,
      event.eventId,
      trip.id,
      trip.vehicleId,
      "station_fee_expense",
      fee,
      "Station departure/platform fee"
    );
  }

  private postArrivalStationFee(
    event: DomainEventEnvelope,
    payload: ArrivedEventPayload
  ): void {
    const trip = this.repositories.trips.getById(payload.tripId);
    if (!trip) return;

    const route = this.repositories.routes.getById(trip.routeId);
    if (!route) return;

    const fee = this.policy.stationArrivalFeeCents(
      payload.stationId,
      event.gameSecond
    );
    if (Number(fee) <= 0) return;

    this.postExpensePayable(
      route.companyId,
      event.gameSecond,
      "station_usage",
      `${event.eventId}:arrival_station`,
      event.eventId,
      trip.id,
      trip.vehicleId,
      "station_fee_expense",
      fee,
      "Station arrival/platform fee"
    );
  }

  private postOperatingInterval(
    event: DomainEventEnvelope,
    payload: OperatingIntervalPayload
  ): void {
    const trip = this.repositories.trips.getById(payload.tripId);
    const vehicle = this.repositories.vehicles.getById(payload.vehicleId);
    if (!trip || !vehicle) return;

    const route = this.repositories.routes.getById(trip.routeId);
    if (!route) return;

    const runtime = this.repositories.finance.getRuntimeState();
    const vehicleEconomics =
      this.repositories.finance.getVehicleEconomicProfile(vehicle.modelId);

    if (vehicleEconomics) {
      this.postManagementDistanceCost(
        event,
        route.companyId,
        trip.id,
        vehicle.id,
        payload.distanceTraveledM,
        "maintenance_wear",
        Number(vehicleEconomics.maintenanceEconomicCostCentsPerKm),
        runtime
      );

      this.postManagementDistanceCost(
        event,
        route.companyId,
        trip.id,
        vehicle.id,
        payload.distanceTraveledM,
        "economic_depreciation",
        Number(vehicleEconomics.economicDepreciationCentsPerKm),
        runtime
      );
    }

    for (const usage of payload.roadUsage) {
      const road = this.repositories.world.get().getRoad(
        usage.roadSegmentId
      );
      if (!road) continue;

      const rate = this.policy.roadTollMilliCentsPerKm(
        road.roadClass,
        event.gameSecond
      );
      const tollCents = runtime.consumeFraction(
        `toll:${vehicle.id}:${road.roadClass}`,
        rate * usage.distanceM,
        1_000_000
      );

      if (tollCents > 0) {
        this.postExpensePayable(
          route.companyId,
          event.gameSecond,
          "road_toll",
          `${event.eventId}:toll:${road.id}`,
          event.eventId,
          trip.id,
          vehicle.id,
          "road_toll_expense",
          units.moneyCents(tollCents),
          "Road toll"
        );
      }
    }

    const driverProfile =
      this.repositories.finance.getDriverCompensationProfile(
        payload.driverId
      );
    if (driverProfile) {
      this.postVariableDriverLabor(
        event,
        route.companyId,
        trip.id,
        vehicle.id,
        driverProfile,
        payload.movingSeconds + payload.idleSeconds,
        runtime
      );
    }

    this.repositories.finance.replaceRuntimeState(runtime);
  }

  private postVehiclePurchase(
    event: DomainEventEnvelope,
    payload: VehiclePurchasedPayload
  ): void {
    this.repositories.finance.saveVehicleAssetProfile({
      vehicleId: payload.vehicleId,
      companyId: payload.companyId,
      acquisitionCostCents: payload.purchasePriceCents,
      residualValueCents: payload.residualValueCents,
      usefulLifeDays: payload.usefulLifeDays,
      acquiredGameSecond: event.gameSecond,
      dailyInsuranceCents: payload.dailyInsuranceCents,
      dailyVehicleTaxCents: payload.dailyVehicleTaxCents
    });

    if (Number(payload.purchasePriceCents) <= 0) return;

    this.postLedger({
      companyId: payload.companyId,
      gameSecond: event.gameSecond,
      kind: "vehicle_purchase",
      sourceRef: `${event.eventId}:purchase`,
      sourceEventId: event.eventId,
      tripId: null,
      vehicleId: payload.vehicleId,
      memo: "Vehicle acquisition",
      postings: [
        debit("vehicle_asset", payload.purchasePriceCents),
        credit("cash", payload.purchasePriceCents)
      ]
    });
  }

  private postEnergyPurchase(
    event: DomainEventEnvelope,
    payload: VehicleEnergyPurchasedPayload
  ): void {
    const sourceRef = `${event.eventId}:energy_inventory`;
    const runtime = this.repositories.finance.getRuntimeState();

    if (runtime.hasProcessedRuntimeSource(sourceRef)) return;

    runtime.addEnergyInventory(
      payload.vehicleId,
      payload.energyUnits,
      Number(payload.totalCostCents)
    );
    runtime.markProcessedRuntimeSource(sourceRef);
    this.repositories.finance.replaceRuntimeState(runtime);

    if (Number(payload.totalCostCents) <= 0) return;

    this.postLedger({
      companyId: payload.companyId,
      gameSecond: event.gameSecond,
      kind: "energy_purchase",
      sourceRef,
      sourceEventId: event.eventId,
      tripId: null,
      vehicleId: payload.vehicleId,
      memo: "Vehicle energy inventory purchase",
      postings: [
        debit("energy_inventory", payload.totalCostCents),
        credit("cash", payload.totalCostCents)
      ]
    });
  }

  private postEnergyConsumption(
    event: DomainEventEnvelope,
    payload: VehicleEnergyConsumedPayload
  ): void {
    const sourceRef = `${event.eventId}:energy_consumption`;
    const runtime = this.repositories.finance.getRuntimeState();

    if (runtime.hasProcessedRuntimeSource(sourceRef)) return;

    const consumed = runtime.consumeEnergyInventory(
      payload.vehicleId,
      payload.energyUnits
    );
    runtime.markProcessedRuntimeSource(sourceRef);
    this.repositories.finance.replaceRuntimeState(runtime);

    if (consumed.bookValueCents <= 0) return;

    const vehicle = this.repositories.vehicles.getById(payload.vehicleId);
    if (!vehicle) return;

    const amount = units.moneyCents(consumed.bookValueCents);
    this.postLedger({
      companyId: vehicle.companyId,
      gameSecond: event.gameSecond,
      kind: "energy_consumption",
      sourceRef,
      sourceEventId: event.eventId,
      tripId: payload.tripId,
      vehicleId: payload.vehicleId,
      memo: "Consumed vehicle energy inventory",
      postings: [
        debit("energy_expense", amount),
        credit("energy_inventory", amount)
      ]
    });
  }

  private postVehicleCost(
    event: DomainEventEnvelope,
    payload: VehicleCostPayload,
    kind: FinanceEntryKind,
    account: FinanceAccount,
    memo: string
  ): void {
    if (Number(payload.costCents) <= 0) return;

    this.postExpensePayable(
      payload.companyId,
      event.gameSecond,
      kind,
      `${event.eventId}:${kind}`,
      event.eventId,
      null,
      payload.vehicleId,
      account,
      payload.costCents,
      memo
    );
  }

  private postVehicleDisposal(
    event: DomainEventEnvelope,
    payload: VehicleDisposalPayload
  ): void {
    const asset = this.repositories.finance.getVehicleAssetProfile(
      payload.vehicleId
    );
    const runtime = this.repositories.finance.getRuntimeState();
    const energy = runtime.removeEnergyInventory(payload.vehicleId);
    this.repositories.finance.replaceRuntimeState(runtime);

    if (!asset) {
      if (Number(payload.proceedsCents) > 0) {
        this.postLedger({
          companyId: payload.companyId,
          gameSecond: event.gameSecond,
          kind: "vehicle_disposal",
          sourceRef: `${event.eventId}:disposal`,
          sourceEventId: event.eventId,
          tripId: null,
          vehicleId: payload.vehicleId,
          memo: "Vehicle disposal without active asset profile",
          postings: [
            debit("cash", payload.proceedsCents),
            credit("gain_on_vehicle_disposal", payload.proceedsCents)
          ]
        });
      }
      return;
    }

    const vehicleEntries =
      this.repositories.finance.ledgerEntriesByVehicle(payload.vehicleId);
    const accumulatedDepreciation = creditTotalCents(
      vehicleEntries,
      "accumulated_depreciation"
    );
    const acquisition = Number(asset.acquisitionCostCents);
    const netVehicleBook = Math.max(
      0,
      acquisition - accumulatedDepreciation
    );
    const totalBook = netVehicleBook + energy.bookValueCents;
    const proceeds = Number(payload.proceedsCents);
    const postings: LedgerPosting[] = [];

    if (proceeds > 0) {
      postings.push(debit("cash", payload.proceedsCents));
    }
    if (accumulatedDepreciation > 0) {
      postings.push(
        debit(
          "accumulated_depreciation",
          units.moneyCents(accumulatedDepreciation)
        )
      );
    }

    if (proceeds < totalBook) {
      postings.push(
        debit(
          "loss_on_vehicle_disposal",
          units.moneyCents(totalBook - proceeds)
        )
      );
    }

    if (acquisition > 0) {
      postings.push(
        credit("vehicle_asset", units.moneyCents(acquisition))
      );
    }
    if (energy.bookValueCents > 0) {
      postings.push(
        credit(
          "energy_inventory",
          units.moneyCents(energy.bookValueCents)
        )
      );
    }
    if (proceeds > totalBook) {
      postings.push(
        credit(
          "gain_on_vehicle_disposal",
          units.moneyCents(proceeds - totalBook)
        )
      );
    }

    this.repositories.finance.removeVehicleAssetProfile(payload.vehicleId);

    if (postings.length >= 2) {
      this.postLedger({
        companyId: payload.companyId,
        gameSecond: event.gameSecond,
        kind: "vehicle_disposal",
        sourceRef: `${event.eventId}:disposal`,
        sourceEventId: event.eventId,
        tripId: null,
        vehicleId: payload.vehicleId,
        memo: "Vehicle disposal and asset derecognition",
        postings
      });
    }
  }

  private postVariableDriverLabor(
    event: DomainEventEnvelope,
    companyId: CompanyId,
    tripId: TripId,
    vehicleId: VehicleId,
    profile: DriverCompensationProfile,
    dutySeconds: number,
    runtime: ReturnType<RepositoryBundle["finance"]["getRuntimeState"]>
  ): void {
    const wageCents = runtime.consumeFraction(
      `driver.allowance:${profile.staffId}`,
      Number(profile.drivingAllowanceCentsPerHour) * dutySeconds,
      3_600
    );
    if (wageCents <= 0) return;

    const burdenCents = runtime.consumeFraction(
      `driver.burden:${profile.staffId}`,
      wageCents * Number(profile.employerBurdenPermille),
      1000
    );

    const postings: LedgerPosting[] = [
      debit("driver_wage_expense", units.moneyCents(wageCents))
    ];
    if (burdenCents > 0) {
      postings.push(
        debit(
          "employer_burden_expense",
          units.moneyCents(burdenCents)
        )
      );
    }
    postings.push(
      credit(
        "payroll_payable",
        units.moneyCents(wageCents + burdenCents)
      )
    );

    this.postLedger({
      companyId,
      gameSecond: event.gameSecond,
      kind: "driver_allowance",
      sourceRef: `${event.eventId}:driver_allowance`,
      sourceEventId: event.eventId,
      tripId,
      vehicleId,
      memo: "Driver trip allowance and employer burden",
      postings
    });
  }

  private postManagementDistanceCost(
    event: DomainEventEnvelope,
    companyId: CompanyId,
    tripId: TripId,
    vehicleId: VehicleId,
    distanceM: number,
    category: ManagementCostCategory,
    centsPerKm: number,
    runtime: ReturnType<RepositoryBundle["finance"]["getRuntimeState"]>
  ): void {
    const amount = runtime.consumeFraction(
      `management:${category}:${vehicleId}`,
      centsPerKm * distanceM,
      1000
    );
    if (amount <= 0) return;

    const sourceRef = `${event.eventId}:management:${category}`;
    if (this.repositories.finance.hasManagementCostSourceRef(sourceRef)) {
      return;
    }

    this.repositories.finance.appendManagementCost({
      sourceRef,
      sourceEventId: event.eventId,
      companyId,
      tripId,
      gameSecond: event.gameSecond,
      category,
      amountCents: units.moneyCents(amount)
    });
  }

  private accrueCompanyDay(
    companyId: CompanyId,
    day: number,
    gameSecond: GameSecond
  ): void {
    const companyProfile =
      this.repositories.finance.companyFinancialProfiles().find(
        (profile) => profile.companyId === companyId
      );
    if (!companyProfile) return;

    if (Number(companyProfile.dailyOverheadCents) > 0) {
      this.postExpensePayable(
        companyId,
        gameSecond,
        "company_overhead",
        `daily:${companyId}:${day}:overhead`,
        null,
        null,
        null,
        "company_overhead_expense",
        companyProfile.dailyOverheadCents,
        "Daily company administration overhead"
      );
    }

    const regulatory = this.policy.companyDailyRegulatoryFeeCents(
      companyId,
      day
    );
    if (Number(regulatory) > 0) {
      this.postExpensePayable(
        companyId,
        gameSecond,
        "company_overhead",
        `daily:${companyId}:${day}:regulatory`,
        null,
        null,
        null,
        "company_overhead_expense",
        regulatory,
        "Daily regulatory/permit allocation"
      );
    }

    const runtime = this.repositories.finance.getRuntimeState();

    for (const driver of this.repositories.finance.driverCompensationProfilesByCompany(companyId)) {
      const baseWage = Number(driver.baseDailyWageCents);
      const burden = runtime.consumeFraction(
        `driver.burden:${driver.staffId}`,
        baseWage * Number(driver.employerBurdenPermille),
        1000
      );

      if (baseWage + burden <= 0) continue;

      const postings: LedgerPosting[] = [];
      if (baseWage > 0) {
        postings.push(
          debit("driver_wage_expense", units.moneyCents(baseWage))
        );
      }
      if (burden > 0) {
        postings.push(
          debit(
            "employer_burden_expense",
            units.moneyCents(burden)
          )
        );
      }
      postings.push(
        credit(
          "payroll_payable",
          units.moneyCents(baseWage + burden)
        )
      );

      this.postLedger({
        companyId,
        gameSecond,
        kind: "driver_base_wage",
        sourceRef: `daily:${companyId}:${day}:driver:${driver.staffId}`,
        sourceEventId: null,
        tripId: null,
        vehicleId: null,
        memo: "Daily driver base wage and employer burden",
        postings
      });
    }

    for (const vehicle of this.repositories.finance.vehicleAssetProfilesByCompany(companyId)) {
      this.accrueVehicleDay(vehicle, day, gameSecond);
    }

    for (const station of this.repositories.finance.stationFinancialProfilesByCompany(companyId)) {
      if (Number(station.dailyLeaseCents) <= 0) continue;
      this.postExpensePayable(
        companyId,
        gameSecond,
        "station_lease",
        `daily:${companyId}:${day}:station:${station.stationId}`,
        null,
        null,
        null,
        "station_lease_expense",
        station.dailyLeaseCents,
        "Daily station lease/allocation"
      );
    }

    this.repositories.finance.replaceRuntimeState(runtime);
  }

  private accrueVehicleDay(
    profile: VehicleAssetProfile,
    day: number,
    gameSecond: GameSecond
  ): void {
    if (Number(profile.dailyInsuranceCents) > 0) {
      this.postExpensePayable(
        profile.companyId,
        gameSecond,
        "insurance",
        `daily:${profile.companyId}:${day}:insurance:${profile.vehicleId}`,
        null,
        null,
        profile.vehicleId,
        "insurance_expense",
        profile.dailyInsuranceCents,
        "Daily vehicle insurance allocation"
      );
    }

    if (Number(profile.dailyVehicleTaxCents) > 0) {
      this.postExpensePayable(
        profile.companyId,
        gameSecond,
        "vehicle_tax",
        `daily:${profile.companyId}:${day}:vehicle_tax:${profile.vehicleId}`,
        null,
        null,
        profile.vehicleId,
        "vehicle_tax_expense",
        profile.dailyVehicleTaxCents,
        "Daily vehicle tax/inspection allocation"
      );
    }

    const depreciation = depreciationForCompletedDay(profile, day);
    if (depreciation > 0) {
      const amount = units.moneyCents(depreciation);
      this.postLedger({
        companyId: profile.companyId,
        gameSecond,
        kind: "depreciation",
        sourceRef: `daily:${profile.companyId}:${day}:depreciation:${profile.vehicleId}`,
        sourceEventId: null,
        tripId: null,
        vehicleId: profile.vehicleId,
        memo: "Straight-line vehicle depreciation",
        postings: [
          debit("depreciation_expense", amount),
          credit("accumulated_depreciation", amount)
        ]
      });
    }
  }

  private settleLiabilities(gameSecond: GameSecond): void {
    for (const companyProfile of this.repositories.finance.companyFinancialProfiles()) {
      let entries = this.repositories.finance.ledgerEntriesByCompany(
        companyProfile.companyId
      );
      let cash = accountBalanceCents(entries, "cash");
      if (cash <= 0) continue;

      for (const account of [
        "tax_payable",
        "payroll_payable",
        "accounts_payable"
      ] as const) {
        entries = this.repositories.finance.ledgerEntriesByCompany(
          companyProfile.companyId
        );
        cash = accountBalanceCents(entries, "cash");
        const payable = accountBalanceCents(entries, account);

        if (cash <= 0 || payable <= 0) continue;

        const payment = Math.min(cash, payable);
        const amount = units.moneyCents(payment);
        this.postLedger({
          companyId: companyProfile.companyId,
          gameSecond,
          kind: "liability_settlement",
          sourceRef:
            `settlement:${companyProfile.companyId}:${Number(gameSecond)}:${account}`,
          sourceEventId: null,
          tripId: null,
          vehicleId: null,
          memo: `Settle ${account}`,
          postings: [
            debit(account, amount),
            credit("cash", amount)
          ]
        });
      }
    }
  }

  private postExpensePayable(
    companyId: CompanyId,
    gameSecond: GameSecond,
    kind: FinanceEntryKind,
    sourceRef: string,
    sourceEventId: EventId | null,
    tripId: TripId | null,
    vehicleId: VehicleId | null,
    expenseAccount: FinanceAccount,
    amount: MoneyCents,
    memo: string
  ): void {
    if (Number(amount) <= 0) return;

    this.postLedger({
      companyId,
      gameSecond,
      kind,
      sourceRef,
      sourceEventId,
      tripId,
      vehicleId,
      memo,
      postings: [
        debit(expenseAccount, amount),
        credit("accounts_payable", amount)
      ]
    });
  }

  private postLedger(
    input: Omit<LedgerEntry, "id">
  ): void {
    if (this.repositories.finance.hasLedgerSourceRef(input.sourceRef)) {
      return;
    }

    const id = ids.financeEntry(
      `finance_entry.${sanitize(input.sourceRef)}`
    );
    const entry: LedgerEntry = { id, ...input };
    assertBalancedLedgerEntry(entry);
    this.repositories.finance.appendLedgerEntry(entry);

    this.events.publish(
      createSimulationDomainEvent(
        "finance.entryPosted",
        "finance",
        entry.id,
        entry.gameSecond,
        {
          entryId: entry.id,
          companyId: entry.companyId,
          kind: entry.kind,
          sourceRef: entry.sourceRef
        }
      )
    );
  }
}

function depreciationForCompletedDay(
  profile: VehicleAssetProfile,
  completedGameDay: number
): number {
  if (
    !Number.isSafeInteger(profile.usefulLifeDays) ||
    profile.usefulLifeDays <= 0
  ) {
    return 0;
  }

  const acquisitionDay =
    Math.floor(Number(profile.acquiredGameSecond) / SECONDS_PER_DAY) + 1;

  const currentLifeDays = Math.max(
    0,
    Math.min(
      profile.usefulLifeDays,
      completedGameDay - acquisitionDay + 1
    )
  );
  const previousLifeDays = Math.max(
    0,
    Math.min(profile.usefulLifeDays, currentLifeDays - 1)
  );

  const depreciableBase = Math.max(
    0,
    Number(profile.acquisitionCostCents) -
      Number(profile.residualValueCents)
  );

  const cumulativeCurrent = Math.floor(
    (depreciableBase * currentLifeDays) / profile.usefulLifeDays
  );
  const cumulativePrevious = Math.floor(
    (depreciableBase * previousLifeDays) / profile.usefulLifeDays
  );

  return cumulativeCurrent - cumulativePrevious;
}

function debit(
  account: FinanceAccount,
  amountCents: MoneyCents
): LedgerPosting {
  return { account, side: "debit", amountCents };
}

function credit(
  account: FinanceAccount,
  amountCents: MoneyCents
): LedgerPosting {
  return { account, side: "credit", amountCents };
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}
