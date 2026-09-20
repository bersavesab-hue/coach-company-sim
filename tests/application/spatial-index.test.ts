import assert from "node:assert/strict";
import test from "node:test";

import { PointSpatialIndex } from "../../src/application/spatial/PointSpatialIndex.js";

test("point spatial index returns only values inside bbox", () => {
  const index = new PointSpatialIndex<string, string>(100);

  index.upsert("a", { xM: 10, yM: 10 }, "A");
  index.upsert("b", { xM: 150, yM: 10 }, "B");
  index.upsert("c", { xM: 500, yM: 500 }, "C");

  assert.deepEqual(
    [...index.query({
      minXM: 0,
      minYM: 0,
      maxXM: 200,
      maxYM: 100
    })].sort(),
    ["A", "B"]
  );
});
