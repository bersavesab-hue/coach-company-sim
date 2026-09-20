import type { CommandBus } from "../../CommandBus.js";
import type {
  CreateVehicleConfigurationPayload,
  InspectVehicleListingPayload,
  ListOwnedVehiclePayload,
  NegotiateVehicleListingPayload,
  PlaceVehicleAuctionBidPayload,
  PurchaseVehicleListingPayload,
  SellVehicleToDealerPayload,
  SettleVehicleAuctionPayload,
  StartVehicleAuctionPayload,
  WithdrawVehicleListingPayload
} from "../../commands/vehicle-market/VehicleMarketCommands.js";
import type { VehicleMarketTradingService } from "../../services/VehicleMarketTradingService.js";

export function registerVehicleMarketHandlers(
  commands: CommandBus,
  trading: VehicleMarketTradingService
): void {
  commands.register("vehicleMarket.createConfiguration", (command) =>
    trading.createConfiguration(
      command,
      command.payload as CreateVehicleConfigurationPayload
    )
  );
  commands.register("vehicleMarket.purchaseListing", (command) =>
    trading.purchaseListing(
      command,
      command.payload as PurchaseVehicleListingPayload
    )
  );
  commands.register("vehicleMarket.listOwnedVehicle", (command) =>
    trading.listOwnedVehicle(
      command,
      command.payload as ListOwnedVehiclePayload
    )
  );
  commands.register("vehicleMarket.sellToDealer", (command) =>
    trading.sellToDealer(
      command,
      command.payload as SellVehicleToDealerPayload
    )
  );
  commands.register("vehicleMarket.withdrawListing", (command) =>
    trading.withdrawListing(
      command,
      command.payload as WithdrawVehicleListingPayload
    )
  );
  commands.register("vehicleMarket.inspectListing", (command) =>
    trading.inspectListing(
      command,
      command.payload as InspectVehicleListingPayload
    )
  );
  commands.register("vehicleMarket.negotiateListing", (command) =>
    trading.negotiateListing(
      command,
      command.payload as NegotiateVehicleListingPayload
    )
  );
  commands.register("vehicleMarket.startAuction", (command) =>
    trading.startAuction(
      command,
      command.payload as StartVehicleAuctionPayload
    )
  );
  commands.register("vehicleMarket.placeAuctionBid", (command) =>
    trading.placeAuctionBid(
      command,
      command.payload as PlaceVehicleAuctionBidPayload
    )
  );
  commands.register("vehicleMarket.settleAuction", (command) =>
    trading.settleAuction(
      command,
      command.payload as SettleVehicleAuctionPayload
    )
  );
}
