import {
  PassengerTransportApp,
  createDemoState
} from "./public-api.js";

const state = createDemoState();
const app = new PassengerTransportApp(state);

app.dispatch({
  type: "vehicle.assignRoute",
  vehicleId: "vehicle.001",
  routeId: "route.K01"
});

app.dispatch({
  type: "vehicle.start",
  vehicleId: "vehicle.001"
});

app.tick(600);

console.log(
  JSON.stringify(
    {
      version: state.gameVersion,
      day: state.clock.day,
      time:
        String(state.clock.hour).padStart(2, "0") +
        ":" +
        String(state.clock.minute).padStart(2, "0"),
      vehicle: state.vehicles["vehicle.001"],
      waitingPassengers:
        state.world.nodes["station.start"]?.waitingPassengers ?? null
    },
    null,
    2
  )
);
