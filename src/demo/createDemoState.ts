import { GameState } from "../state/GameState.js";

export function createDemoState(): GameState {
  return new GameState(
    {
      id: "company.demo",
      name: "启程客运",
      cashCents: 8_000_000,
      reputationPermille: 120,
      totalRevenueCents: 0,
      licenseLevel: "county"
    },
    {
      nodes: {
        "station.start": {
          id: "station.start",
          name: "中心客运站",
          type: "bus_station",
          position: { xM: 0, yM: 0 },
          waitingPassengers: 80
        },
        "town.river": {
          id: "town.river",
          name: "河湾镇",
          type: "town",
          position: { xM: 10_000, yM: 7_000 },
          waitingPassengers: 35
        },
        "town.port": {
          id: "town.port",
          name: "东港镇",
          type: "town",
          position: { xM: 26_000, yM: -3_000 },
          waitingPassengers: 45
        }
      },
      roads: {
        "road.start.river": {
          id: "road.start.river",
          name: "迎宾大道",
          fromNodeId: "station.start",
          toNodeId: "town.river",
          lengthM: 13_000,
          speedLimitMps: 17,
          polyline: [
            { xM: 0, yM: 0 },
            { xM: 5_000, yM: 2_000 },
            { xM: 10_000, yM: 7_000 }
          ]
        },
        "road.river.port": {
          id: "road.river.port",
          name: "滨河公路",
          fromNodeId: "town.river",
          toNodeId: "town.port",
          lengthM: 20_000,
          speedLimitMps: 20,
          polyline: [
            { xM: 10_000, yM: 7_000 },
            { xM: 18_000, yM: 4_000 },
            { xM: 26_000, yM: -3_000 }
          ]
        }
      }
    },
    {
      "route.K01": {
        id: "route.K01",
        code: "K01",
        name: "中心客运站—东港镇",
        type: "county",
        stopNodeIds: [
          "station.start",
          "town.river",
          "town.port"
        ],
        roadSegmentIds: [
          "road.start.river",
          "road.river.port"
        ],
        fareCents: 800,
        departureIntervalSeconds: 1_200,
        active: true
      }
    },
    {
      "vehicle.001": {
        id: "vehicle.001",
        fleetNo: "K01-01",
        modelId: "vehicle_model.demo_midibus_19",
        seats: 19,
        standingCapacity: 0,
        fuelPermille: 820,
        conditionPermille: 670,
        mileageM: 428_000_000,
        status: "idle",
        routeId: null,
        routeSegmentIndex: 0,
        offsetOnSegmentM: 0,
        cruiseSpeedMps: 15,
        passengers: 14,
        worldPosition: { xM: 0, yM: 0 }
      }
    },
    [
      {
        nodeId: "station.start",
        basePassengersPerGameHour: 42
      },
      {
        nodeId: "town.river",
        basePassengersPerGameHour: 20
      },
      {
        nodeId: "town.port",
        basePassengersPerGameHour: 18
      }
    ]
  );
}
