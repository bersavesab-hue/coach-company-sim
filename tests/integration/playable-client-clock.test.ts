import assert from "node:assert/strict";
import test from "node:test";

import { PlayableClient } from "../../src/presentation/android/PlayableClient.js";

test("playable client automatic clock advances canonical simulation time", async () => {
  const client = new PlayableClient();
  const before = await client.snapshot();

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
