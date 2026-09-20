import assert from "node:assert/strict";
import test from "node:test";

import { GameClock } from "../../src/core/time/GameClock.js";
import { gameDayAt } from "../../src/core/time/GameTime.js";
import { units } from "../../src/core/units/Units.js";

test("GameClock advances only canonical game seconds", () => {
  const clock = new GameClock(units.gameSecond(86_000));
  const now = clock.advance(units.gameSecond(1_000));

  assert.equal(Number(now), 87_000);
  assert.equal(gameDayAt(now), 2);
});
