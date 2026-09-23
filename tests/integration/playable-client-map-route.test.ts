import assert from "node:assert/strict";
import test from "node:test";

import {
  PlayableClient
} from "../../src/presentation/android/PlayableClient.js";

test(
  "map route preview uses the same canonical road path as route creation",
  async () => {
    const client = new PlayableClient();
    const before = await client.snapshot();
    const unlocked = before.stations.filter(
      (station) => station.unlocked
    );
    assert.ok(unlocked.length >= 2);

    const origin = unlocked[0]!;
    const destination = unlocked[1]!;
    const preview = await client.previewRoute({
      originStationId: origin.id,
      destinationStationId:
        destination.id
    });

    assert.equal(preview.ok, true);
    assert.ok(preview.pathPoints.length > 1);
    assert.ok(preview.distanceM > 0);
    assert.ok(preview.estimatedSeconds > 0);

    const created = await client.createRoute({
      code: "K99",
      originStationId: origin.id,
      destinationStationId:
        destination.id
    });
    assert.equal(created.ok, true);

    const after = await client.snapshot();
    const route = after.routes.find(
      (value) => value.code === "K99"
    );
    assert.ok(route);
    assert.deepEqual(
      route.pathPoints,
      preview.pathPoints
    );
  }
);

test(
  "map route preview rejects locked stations",
  async () => {
    const client = new PlayableClient();
    const snapshot = await client.snapshot();
    const origin = snapshot.stations.find(
      (station) => station.unlocked
    );
    const locked = snapshot.stations.find(
      (station) => !station.unlocked
    );
    assert.ok(origin);
    assert.ok(locked);

    const preview = await client.previewRoute({
      originStationId: origin.id,
      destinationStationId: locked.id
    });
    assert.equal(preview.ok, false);
    assert.equal(
      preview.pathPoints.length,
      0
    );
  }
);
