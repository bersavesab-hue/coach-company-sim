import type { GameSecond } from "../../core/units/Units.js";
import type { VehicleMarketTradingService } from "../services/VehicleMarketTradingService.js";

export class VehicleMarketCoordinator {
  constructor(
    private readonly trading: VehicleMarketTradingService
  ) {}

  advanceTo(gameSecond: GameSecond): void {
    const refreshed = this.trading.refresh(gameSecond);
    if (!refreshed.ok) {
      throw refreshed.error;
    }
  }
}
