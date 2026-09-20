import type {
  CompanyId,
  RouteId,
  StationId
} from "../../contracts/ids/EntityIds.js";
import type {
  GameSecond,
  MoneyCents
} from "../../core/units/Units.js";
import type { RoadClass } from "../../domain/world/RoadSegment.js";
import type { EnergyKind } from "../../domain/vehicle/EnergyKind.js";

export interface EconomicPolicy {
  energyPriceMilliCentsPerUnit(
    energyKind: EnergyKind,
    gameSecond: GameSecond
  ): number;

  roadTollMilliCentsPerKm(
    roadClass: RoadClass,
    gameSecond: GameSecond
  ): number;

  ticketTaxCents(
    grossFareCents: MoneyCents,
    routeId: RouteId,
    gameSecond: GameSecond
  ): MoneyCents;

  stationDepartureFeeCents(
    stationId: StationId,
    gameSecond: GameSecond
  ): MoneyCents;

  stationArrivalFeeCents(
    stationId: StationId,
    gameSecond: GameSecond
  ): MoneyCents;

  stationPassengerServiceFeeCents(
    stationId: StationId,
    boardedPassengerCount: number,
    gameSecond: GameSecond
  ): MoneyCents;

  companyDailyRegulatoryFeeCents(
    companyId: CompanyId,
    completedGameDay: number
  ): MoneyCents;
}
