import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleMarketTradingService } from "../services/VehicleMarketTradingService.js";
import type { NewVehicleStockGenerator } from "./NewVehicleStockGenerator.js";
import type { UsedVehicleStockGenerator } from "./UsedVehicleStockGenerator.js";
import type { VehicleVariantLifecycleRefresher } from "./VehicleVariantLifecycleRefresher.js";

export class VehicleMarketCoordinator {
  constructor(
    private readonly trading: VehicleMarketTradingService,
    private readonly lifecycle: VehicleVariantLifecycleRefresher,
    private readonly newVehicleStock: NewVehicleStockGenerator,
    private readonly usedVehicleStock: UsedVehicleStockGenerator
  ) {}

  advanceTo(gameSecond: GameSecond): void {
    const refreshed = this.trading.refresh(gameSecond);
    if (!refreshed.ok) {
      throw refreshed.error;
    }
    this.lifecycle.refresh(gameSecond);
    this.newVehicleStock.refresh(gameSecond);
    this.usedVehicleStock.refresh(gameSecond);
  }
}
