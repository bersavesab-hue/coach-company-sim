export type GameCommand =
  | {
      type: "vehicle.assignRoute";
      vehicleId: string;
      routeId: string;
    }
  | {
      type: "vehicle.start";
      vehicleId: string;
    }
  | {
      type: "vehicle.stop";
      vehicleId: string;
    };
