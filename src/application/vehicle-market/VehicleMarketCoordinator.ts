import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleMarketTradingService } from "../services/VehicleMarketTradingService.js";
import type { NewVehicleStockGenerator } from "./NewVehicleStockGenerator.js";
import type { UsedVehicleStockGenerator } from "./UsedVehicleStockGenerator.js";

export class VehicleMarketCoordinator {
  constructor(
    private readonly trading: VehicleMarketTradingService,
    private readonly newVehicleStock: NewVehicleStockGenerator,
    private readonly usedVehicleStock: UsedVehicleStockGenerator
  ) {}

  advanceTo(gameSecond: GameSecond): void {
    const refreshed = this.trading.refresh(gameSecond);
    if (!refreshed.ok) {
      throw refreshed.error;
    }
    this.newVehicleStock.refresh(gameSecond);
    this.usedVehicleStock.refresh(gameSecond);
  }
}
