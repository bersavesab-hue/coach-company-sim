import assert from "node:assert/strict";
import test from "node:test";

import {
  PassengerTransportApp,
  createDemoState,
  decodeSave,
  encodeSave
} from "../src/public-api.js";

test("vehicle moves using canonical world coordinates", () => {
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

  const vehicle = state.vehicles["vehicle.001"]!;
  const beforeMileage = vehicle.mileageM;

  app.tick(300);

  assert.ok(vehicle.mileageM > beforeMileage);
  assert.notDeepEqual(vehicle.worldPosition, { xM: 0, yM: 0 });
});

test("vehicle can cross from one road segment to the next", () => {
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

  app.tick(1_000);

  const vehicle = state.vehicles["vehicle.001"]!;
  assert.ok(vehicle.routeSegmentIndex >= 1);
});

test("passenger demand grows with game time", () => {
  const state = createDemoState();
  const app = new PassengerTransportApp(state);

  const node = state.world.nodes["station.start"]!;
  const before = node.waitingPassengers;

  app.tick(3_600);

  assert.equal(node.waitingPassengers, before + 42);
});

test("save codec round-trips current save version", () => {
  const payload = {
    companyId: "company.demo",
    cashCents: 8_000_000
  };

  const encoded = encodeSave(payload);
  const decoded = decodeSave<typeof payload>(encoded);

  assert.deepEqual(decoded, payload);
});

test("application rejects an unknown route", () => {
  const state = createDemoState();
  const app = new PassengerTransportApp(state);

  assert.throws(() => {
    app.dispatch({
      type: "vehicle.assignRoute",
      vehicleId: "vehicle.001",
      routeId: "route.missing"
    });
  });
});
