import assert from "node:assert/strict";
import test from "node:test";

import { err, ok } from "../../src/core/result/Result.js";

test("Result represents success and expected failure without throwing", () => {
  const success = ok(123);
  const failure = err("NOPE");

  assert.equal(success.ok, true);
  assert.equal(failure.ok, false);

  if (success.ok) assert.equal(success.value, 123);
  if (!failure.ok) assert.equal(failure.error, "NOPE");
});
