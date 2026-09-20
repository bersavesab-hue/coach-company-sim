import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleMarketTradingService } from "../services/VehicleMarketTradingService.js";
import type { NewVehicleStockGenerator } from "./NewVehicleStockGenerator.js";

export class VehicleMarketCoordinator {
  constructor(
    private readonly trading: VehicleMarketTradingService,
    private readonly newVehicleStock: NewVehicleStockGenerator
  ) {}

  advanceTo(gameSecond: GameSecond): void {
    const refreshed = this.trading.refresh(gameSecond);
    if (!refreshed.ok) {
      throw refreshed.error;
    }
    this.newVehicleStock.refresh(gameSecond);
  }
}
