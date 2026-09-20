export { GAME_VERSION, SAVE_VERSION } from "./core/version.js";
export { GameClock } from "./core/GameClock.js";
export { EventBus } from "./core/events.js";

export type { DomainEvent } from "./core/events.js";
export type {
  MoneyCents,
  DistanceM,
  GameSeconds,
  WorldMeter,
  SpeedMps,
  Permille
} from "./core/units.js";

export type {
  MapNode,
  MapNodeType,
  RoadSegment,
  WorldMap,
  WorldPoint
} from "./domain/map.js";

export type {
  PassengerRoute,
  RouteType
} from "./domain/route.js";

export type {
  Vehicle,
  VehicleStatus
} from "./domain/vehicle.js";

export type {
  CompanyState,
  LicenseLevel
} from "./domain/company.js";

export { GameState } from "./state/GameState.js";
export type {
  PassengerDemandProfile
} from "./state/GameState.js";

export type { GameCommand } from "./application/commands.js";
export { PassengerTransportApp } from "./application/PassengerTransportApp.js";

export { pointOnRoad } from "./simulation/mapGeometry.js";

export {
  encodeSave,
  decodeSave
} from "./save/SaveCodec.js";

export { createDemoState } from "./demo/createDemoState.js";
