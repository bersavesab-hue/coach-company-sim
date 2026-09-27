import assert from "node:assert/strict";
import test from "node:test";

import { PlayableClient } from "../../src/presentation/android/PlayableClient.js";
import { parsePlayableSave } from "../../src/save/playable/PlayableSave.js";

test("playable save restores canonical runtime state and allocator continuity", async () => {
  const client = new PlayableClient();
  const initial = await client.snapshot();
  const unlocked = initial.stations.filter((station) => station.unlocked);

  const firstRoute = await client.createRoute({
    code: "SAVE1",
    originStationId: unlocked[0]!.id,
    destinationStationId: unlocked[1]!.id
  });
  assert.equal(firstRoute.ok, true);

  const listing = initial.market.find(
    (value: any) => value.purchaseUnlocked
  );
  assert.ok(listing);
  const purchase = await client.buyVehicle(listing.listingId);
  assert.equal(purchase.ok, true);

  await client.advanceRealtime(1000, 60);
  const beforeSave = await client.snapshot();
  const encoded = JSON.stringify(client.exportSave());
  const parsed = parsePlayableSave(encoded);
  assert.ok(parsed);

  const restored = new PlayableClient(parsed);
  const afterRestore = await restored.snapshot();

  assert.equal(
    afterRestore.currentGameSecond,
    beforeSave.currentGameSecond
  );
  assert.equal(
    afterRestore.finance.cashBalanceCents,
    beforeSave.finance.cashBalanceCents
  );
  assert.equal(
    afterRestore.dispatch.summary.fleetTotal,
    beforeSave.dispatch.summary.fleetTotal
  );
  assert.equal(
    afterRestore.market.length,
    beforeSave.market.length
  );
  assert.ok(
    afterRestore.routes.some((route) => route.code === "SAVE1")
  );

  const secondRoute = await restored.createRoute({
    code: "SAVE2",
    originStationId: unlocked[0]!.id,
    destinationStationId: unlocked[2]!.id
  });
  assert.equal(secondRoute.ok, true);

  const afterSecondRoute = await restored.snapshot();
  const ids = afterSecondRoute.routes
    .filter((route) => route.code === "SAVE1" || route.code === "SAVE2")
    .map((route) => route.id);
  assert.equal(new Set(ids).size, 2);
});

test("playable save parser rejects unsupported save versions", () => {
  const client = new PlayableClient();
  const save = client.exportSave();
  const invalid = JSON.stringify({
    ...save,
    saveVersion: 999
  });
  assert.equal(parsePlayableSave(invalid), null);
});
