import type {
  CompanyId,
  FarePolicyId,
  FleetTaskId,
  ServicePlanId,
  StaffId,
  StationId,
  TripId,
  VehicleAuctionId,
  VehicleBrandId,
  VehicleConfigurationId,
  VehicleDealerId,
  VehicleId,
  VehicleInspectionReportId,
  VehicleListingId,
  VehicleModelId,
  VehicleSeriesId,
  VehicleVariantId
} from "../../contracts/ids/EntityIds.js";
import type { Company } from "../../domain/company/Company.js";
import { FinanceRuntimeState } from "../../domain/finance/FinanceRuntimeState.js";
import type { FarePolicy } from "../../domain/finance/FarePolicy.js";
import type {
  CompanyFinancialProfile,
  DriverCompensationProfile,
  StationFinancialProfile,
  VehicleAssetProfile,
  VehicleEconomicProfile
} from "../../domain/finance/FinancialProfiles.js";
import type { LedgerEntry } from "../../domain/finance/LedgerEntry.js";
import type { ManagementCostEntry } from "../../domain/finance/ManagementCostEntry.js";
import type { CommittedOperationsSchedule } from "../../domain/operations/CommittedOperationsSchedule.js";
import type { FleetTask } from "../../domain/operations/FleetTask.js";
import type { PassengerDemandProfile } from "../../domain/passenger/PassengerDemandProfile.js";
import { PassengerRuntimeState } from "../../domain/passenger/PassengerRuntimeState.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../domain/schedule/ServicePlan.js";
import type { Driver } from "../../domain/staff/Driver.js";
import type { Station } from "../../domain/station/Station.js";
import type { TripInstance } from "../../domain/trip/TripInstance.js";
import { VehicleLifecycleRuntimeState } from "../../domain/vehicle/VehicleLifecycleRuntimeState.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import type { VehicleAuction } from "../../domain/vehicle-market/VehicleAuction.js";
import type { VehicleBrand } from "../../domain/vehicle-market/VehicleBrand.js";
import type { VehicleConfiguration } from "../../domain/vehicle-market/VehicleConfiguration.js";
import type { VehicleDealer } from "../../domain/vehicle-market/VehicleDealer.js";
import type { VehicleInspectionReport } from "../../domain/vehicle-market/VehicleInspectionReport.js";
import type { VehicleListing } from "../../domain/vehicle-market/VehicleListing.js";
import type { VehicleModelIdentity } from "../../domain/vehicle-market/VehicleModelIdentity.js";
import type { VehicleOptionDefinition } from "../../domain/vehicle-market/VehicleOptionDefinition.js";
import type { VehicleSeries } from "../../domain/vehicle-market/VehicleSeries.js";
import type { VehicleVariant } from "../../domain/vehicle-market/VehicleVariant.js";
import type { WorldGraph } from "../../domain/world/WorldGraph.js";
import { WorldRuntimeState } from "../../domain/world/WorldRuntimeState.js";
import type { RepositoryBundle } from "../../application/repositories/RepositoryBundle.js";

export interface InMemoryRepositorySeed {
  readonly world: WorldGraph;
  readonly stations: readonly Station[];
  readonly companies: readonly Company[];
  readonly passengerDemand: readonly PassengerDemandProfile[];
  readonly routes?: readonly PassengerRoute[];
  readonly servicePlans?: readonly ServicePlan[];
  readonly trips?: readonly TripInstance[];
  readonly vehicles?: readonly OwnedVehicle[];
  readonly drivers?: readonly Driver[];
  readonly fleetTasks?: readonly FleetTask[];
  readonly operationsSchedules?: readonly CommittedOperationsSchedule[];
  readonly vehicleModels: readonly VehicleModel[];
  readonly brands: readonly VehicleBrand[];
  readonly series: readonly VehicleSeries[];
  readonly modelIdentities: readonly VehicleModelIdentity[];
  readonly variants: readonly VehicleVariant[];
  readonly options: readonly VehicleOptionDefinition[];
  readonly dealers: readonly VehicleDealer[];
  readonly configurations?: readonly VehicleConfiguration[];
  readonly listings?: readonly VehicleListing[];
  readonly inspectionReports?: readonly VehicleInspectionReport[];
  readonly auctions?: readonly VehicleAuction[];
  readonly farePolicies: readonly FarePolicy[];
  readonly companyFinancialProfiles: readonly CompanyFinancialProfile[];
  readonly vehicleEconomicProfiles: readonly VehicleEconomicProfile[];
  readonly vehicleAssetProfiles?: readonly VehicleAssetProfile[];
  readonly driverCompensationProfiles: readonly DriverCompensationProfile[];
  readonly stationFinancialProfiles: readonly StationFinancialProfile[];
}

export class InMemoryRepositoryBundle implements RepositoryBundle {
  private worldValue: WorldGraph;
  private worldRuntimeValue = new WorldRuntimeState();
  private passengerRuntimeValue = new PassengerRuntimeState();
  private vehicleRuntimeValue = new VehicleLifecycleRuntimeState();
  private financeRuntimeValue = new FinanceRuntimeState();

  private readonly stationsById = new Map<StationId, Station>();
  private readonly companiesById = new Map<CompanyId, Company>();
  private readonly routesById = new Map<string, PassengerRoute>();
  private readonly servicePlansById = new Map<ServicePlanId, ServicePlan>();
  private readonly tripsById = new Map<TripId, TripInstance>();
  private readonly vehiclesById = new Map<VehicleId, OwnedVehicle>();
  private readonly driversById = new Map<StaffId, Driver>();
  private readonly fleetTasksById = new Map<FleetTaskId, FleetTask>();
  private readonly schedulesByKey = new Map<string, CommittedOperationsSchedule>();
  private readonly vehicleModelsById = new Map<VehicleModelId, VehicleModel>();

  private readonly brandsById = new Map<VehicleBrandId, VehicleBrand>();
  private readonly seriesById = new Map<VehicleSeriesId, VehicleSeries>();
  private readonly identitiesById = new Map<VehicleModelId, VehicleModelIdentity>();
  private readonly variantsById = new Map<VehicleVariantId, VehicleVariant>();
  private readonly optionsByCode = new Map<string, VehicleOptionDefinition>();
  private readonly configurationsById = new Map<VehicleConfigurationId, VehicleConfiguration>();
  private readonly dealersById = new Map<VehicleDealerId, VehicleDealer>();
  private readonly listingsById = new Map<VehicleListingId, VehicleListing>();
  private readonly inspectionsById = new Map<VehicleInspectionReportId, VehicleInspectionReport>();
  private readonly auctionsById = new Map<VehicleAuctionId, VehicleAuction>();

  private readonly farePoliciesById = new Map<FarePolicyId, FarePolicy>();
  private readonly vehicleEconomicsById = new Map<VehicleModelId, VehicleEconomicProfile>();
  private readonly vehicleAssetsById = new Map<VehicleId, VehicleAssetProfile>();
  private readonly driverProfilesById = new Map<StaffId, DriverCompensationProfile>();
  private readonly ledger: LedgerEntry[] = [];
  private readonly managementCosts: ManagementCostEntry[] = [];

  private readonly passengerDemandValues: readonly PassengerDemandProfile[];
  private readonly companyFinancialValues: readonly CompanyFinancialProfile[];
  private readonly stationFinancialValues: readonly StationFinancialProfile[];

  constructor(seed: InMemoryRepositorySeed) {
    this.worldValue = seed.world;
    this.passengerDemandValues = [...seed.passengerDemand];
    this.companyFinancialValues = [...seed.companyFinancialProfiles];
    this.stationFinancialValues = [...seed.stationFinancialProfiles];

    for (const value of seed.stations) this.stationsById.set(value.id, value);
    for (const value of seed.companies) this.companiesById.set(value.id, value);
    for (const value of seed.routes ?? []) this.routesById.set(String(value.id), value);
    for (const value of seed.servicePlans ?? []) this.servicePlansById.set(value.id, value);
    for (const value of seed.trips ?? []) this.tripsById.set(value.id, value);
    for (const value of seed.vehicles ?? []) this.vehiclesById.set(value.id, value);
    for (const value of seed.drivers ?? []) this.driversById.set(value.id, value);
    for (const value of seed.fleetTasks ?? []) this.fleetTasksById.set(value.id, value);
    for (const value of seed.operationsSchedules ?? []) {
      this.schedulesByKey.set(scheduleKey(value.companyId, value.gameDay), value);
    }
    for (const value of seed.vehicleModels) this.vehicleModelsById.set(value.id, value);

    for (const value of seed.brands) this.brandsById.set(value.id, value);
    for (const value of seed.series) this.seriesById.set(value.id, value);
    for (const value of seed.modelIdentities) this.identitiesById.set(value.modelId, value);
    for (const value of seed.variants) this.variantsById.set(value.id, value);
    for (const value of seed.options) this.optionsByCode.set(value.code, value);
    for (const value of seed.configurations ?? []) this.configurationsById.set(value.id, value);
    for (const value of seed.dealers) this.dealersById.set(value.id, value);
    for (const value of seed.listings ?? []) this.listingsById.set(value.id, value);
    for (const value of seed.inspectionReports ?? []) this.inspectionsById.set(value.id, value);
    for (const value of seed.auctions ?? []) this.auctionsById.set(value.id, value);

    for (const value of seed.farePolicies) this.farePoliciesById.set(value.id, value);
    for (const value of seed.vehicleEconomicProfiles) this.vehicleEconomicsById.set(value.vehicleModelId, value);
    for (const value of seed.vehicleAssetProfiles ?? []) this.vehicleAssetsById.set(value.vehicleId, value);
    for (const value of seed.driverCompensationProfiles) this.driverProfilesById.set(value.staffId, value);
  }

  readonly companies = {
    getById: (id: CompanyId) => this.companiesById.get(id),
    save: (value: Company) => { this.companiesById.set(value.id, value); }
  };

  readonly world = {
    get: () => this.worldValue,
    replace: (value: WorldGraph) => { this.worldValue = value; }
  };

  readonly worldRuntime = {
    get: () => this.worldRuntimeValue,
    replace: (value: WorldRuntimeState) => { this.worldRuntimeValue = value; }
  };

  readonly stations = {
    getById: (id: StationId) => this.stationsById.get(id)
  };

  readonly routes = {
    getById: (id: any) => this.routesById.get(String(id)),
    findByCompanyAndCode: (companyId: CompanyId, code: string) =>
      [...this.routesById.values()].find(
        (value) => value.companyId === companyId && value.code === code
      ),
    findActive: () =>
      [...this.routesById.values()].filter((value) => value.status === "active"),
    save: (value: PassengerRoute) => { this.routesById.set(String(value.id), value); }
  };

  readonly servicePlans = {
    getById: (id: ServicePlanId) => this.servicePlansById.get(id),
    findByRoute: (routeId: any) =>
      [...this.servicePlansById.values()].filter((value) => value.routeId === routeId),
    save: (value: ServicePlan) => { this.servicePlansById.set(value.id, value); }
  };

  readonly trips = {
    getById: (id: TripId) => this.tripsById.get(id),
    findByServicePlanAndDeparture: (servicePlanId: ServicePlanId, departure: any) =>
      [...this.tripsById.values()].find(
        (value) =>
          value.servicePlanId === servicePlanId &&
          Number(value.plannedDepartureGameSecond) === Number(departure)
      ),
    findByVehicle: (vehicleId: VehicleId) =>
      [...this.tripsById.values()].filter((value) => value.vehicleId === vehicleId),
    findByDriver: (driverId: StaffId) =>
      [...this.tripsById.values()].filter((value) => value.driverId === driverId),
    findRunning: () =>
      [...this.tripsById.values()].filter(
        (value) => value.status === "running" || value.status === "boarding"
      ),
    save: (value: TripInstance) => { this.tripsById.set(value.id, value); }
  };

  readonly vehicles = {
    getById: (id: VehicleId) => this.vehiclesById.get(id),
    findByCompany: (companyId: CompanyId) =>
      [...this.vehiclesById.values()].filter((value) => value.companyId === companyId),
    save: (value: OwnedVehicle) => { this.vehiclesById.set(value.id, value); }
  };

  readonly vehicleModels = {
    getById: (id: VehicleModelId) => this.vehicleModelsById.get(id)
  };

  readonly vehicleRuntime = {
    get: () => this.vehicleRuntimeValue,
    replace: (value: VehicleLifecycleRuntimeState) => { this.vehicleRuntimeValue = value; }
  };

  readonly staff = {
    getDriverById: (id: StaffId) => this.driversById.get(id),
    findDriversByCompany: (companyId: CompanyId) =>
      [...this.driversById.values()].filter((value) => value.companyId === companyId),
    saveDriver: (value: Driver) => { this.driversById.set(value.id, value); }
  };

  readonly passengerDemand = {
    all: () => this.passengerDemandValues
  };

  readonly passengerRuntime = {
    get: () => this.passengerRuntimeValue,
    replace: (value: PassengerRuntimeState) => { this.passengerRuntimeValue = value; }
  };

  readonly fleetTasks = {
    getById: (id: FleetTaskId) => this.fleetTasksById.get(id),
    findRunning: () =>
      [...this.fleetTasksById.values()].filter((value) => value.status === "running"),
    findByVehicle: (vehicleId: VehicleId) =>
      [...this.fleetTasksById.values()].filter((value) => value.vehicleId === vehicleId),
    findByDriver: (driverId: StaffId) =>
      [...this.fleetTasksById.values()].filter((value) => value.driverId === driverId),
    save: (value: FleetTask) => { this.fleetTasksById.set(value.id, value); }
  };

  readonly operationsSchedules = {
    getByCompanyAndDay: (companyId: CompanyId, gameDay: number) =>
      this.schedulesByKey.get(scheduleKey(companyId, gameDay)),
    findActive: () =>
      [...this.schedulesByKey.values()].filter(
        (value) => value.status === "active" || value.status === "replan_required"
      ),
    findByTrip: (tripId: TripId) =>
      [...this.schedulesByKey.values()].find((value) =>
        value.actions.some((action) => action.tripId === tripId)
      ),
    save: (value: CommittedOperationsSchedule) => {
      this.schedulesByKey.set(scheduleKey(value.companyId, value.gameDay), value);
    }
  };

  readonly vehicleMarket = {
    getBrand: (id: VehicleBrandId) => this.brandsById.get(id),
    getSeries: (id: VehicleSeriesId) => this.seriesById.get(id),
    getModelIdentity: (id: VehicleModelId) => this.identitiesById.get(id),
    getVariant: (id: VehicleVariantId) => this.variantsById.get(id),
    getOption: (code: string) => this.optionsByCode.get(code),
    getConfiguration: (id: VehicleConfigurationId) => this.configurationsById.get(id),
    saveConfiguration: (value: VehicleConfiguration) => {
      this.configurationsById.set(value.id, value);
    },
    getDealer: (id: VehicleDealerId) => this.dealersById.get(id),
    getListing: (id: VehicleListingId) => this.listingsById.get(id),
    findListings: () => [...this.listingsById.values()],
    findAvailableListings: () =>
      [...this.listingsById.values()].filter((value) => value.status === "available"),
    saveListing: (value: VehicleListing) => { this.listingsById.set(value.id, value); },
    getInspectionReport: (id: VehicleInspectionReportId) => this.inspectionsById.get(id),
    findInspectionReportsByListing: (listingId: VehicleListingId) =>
      [...this.inspectionsById.values()].filter((value) => value.listingId === listingId),
    saveInspectionReport: (value: VehicleInspectionReport) => {
      this.inspectionsById.set(value.id, value);
    },
    getAuction: (id: VehicleAuctionId) => this.auctionsById.get(id),
    findAuctions: () => [...this.auctionsById.values()],
    saveAuction: (value: VehicleAuction) => { this.auctionsById.set(value.id, value); }
  };

  readonly finance = {
    getFarePolicy: (id: FarePolicyId) => this.farePoliciesById.get(id),
    getVehicleEconomicProfile: (id: VehicleModelId) => this.vehicleEconomicsById.get(id),
    getVehicleAssetProfile: (id: VehicleId) => this.vehicleAssetsById.get(id),
    saveVehicleAssetProfile: (value: VehicleAssetProfile) => {
      this.vehicleAssetsById.set(value.vehicleId, value);
    },
    removeVehicleAssetProfile: (id: VehicleId) => { this.vehicleAssetsById.delete(id); },
    getDriverCompensationProfile: (id: StaffId) => this.driverProfilesById.get(id),
    companyFinancialProfiles: () => this.companyFinancialValues,
    vehicleAssetProfilesByCompany: (companyId: CompanyId) =>
      [...this.vehicleAssetsById.values()].filter((value) => value.companyId === companyId),
    driverCompensationProfilesByCompany: (companyId: CompanyId) =>
      [...this.driverProfilesById.values()].filter((value) => value.companyId === companyId),
    stationFinancialProfilesByCompany: (companyId: CompanyId) =>
      this.stationFinancialValues.filter((value) => value.companyId === companyId),
    hasLedgerSourceRef: (sourceRef: string) =>
      this.ledger.some((value) => value.sourceRef === sourceRef),
    appendLedgerEntry: (value: LedgerEntry) => { this.ledger.push(value); },
    ledgerEntriesByCompany: (companyId: CompanyId) =>
      this.ledger.filter((value) => value.companyId === companyId),
    ledgerEntriesByTrip: (tripId: TripId) =>
      this.ledger.filter((value) => value.tripId === tripId),
    ledgerEntriesByVehicle: (vehicleId: VehicleId) =>
      this.ledger.filter((value) => value.vehicleId === vehicleId),
    hasManagementCostSourceRef: (sourceRef: string) =>
      this.managementCosts.some((value) => value.sourceRef === sourceRef),
    appendManagementCost: (value: ManagementCostEntry) => {
      this.managementCosts.push(value);
    },
    managementCostsByTrip: (tripId: TripId) =>
      this.managementCosts.filter((value) => value.tripId === tripId),
    getRuntimeState: () => this.financeRuntimeValue,
    replaceRuntimeState: (value: FinanceRuntimeState) => {
      this.financeRuntimeValue = value;
    }
  };

  allStations(): readonly Station[] {
    return [...this.stationsById.values()];
  }

  allRoutes(): readonly PassengerRoute[] {
    return [...this.routesById.values()];
  }

  allServicePlans(): readonly ServicePlan[] {
    return [...this.servicePlansById.values()];
  }
}

function scheduleKey(companyId: CompanyId, gameDay: number): string {
  return `${companyId}:${gameDay}`;
}
