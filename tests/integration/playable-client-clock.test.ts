import assert from "node:assert/strict";
import test from "node:test";

import { PlayableClient } from "../../src/presentation/android/PlayableClient.js";

test("playable client automatic clock advances canonical simulation time", async () => {
  const client = new PlayableClient();
  const before = await client.snapshot();
  const unlocked = before.stations.filter(
    (station) => station.unlocked
  );
  const created = await client.createRoute({
    code: "CLOCK",
    originStationId: unlocked[0]!.id,
    destinationStationId: unlocked[1]!.id
  });
  assert.equal(created.ok, true);
  const withRoute = await client.snapshot();
  const route = withRoute.routes.find(
    (value) => value.code === "CLOCK"
  );
  assert.ok(route);
  const planned = await client.createServicePlan({
    routeId: route.id,
    vehicleClass: "county_midibus",
    startHour: 6,
    endHour: 22,
    intervalMinutes: 60
  });
  assert.equal(planned.ok, true);

  const first = await client.advanceRealtime(500, 60);
  const second = await client.advanceRealtime(500, 60);
  const after = await client.snapshot();

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(
    after.currentGameSecond - before.currentGameSecond,
    60
  );

  await client.advanceRealtime(1000, 0);
  const paused = await client.snapshot();
  assert.equal(paused.currentGameSecond, after.currentGameSecond);
});
