import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve(
    "presentation/apk/index.template.html"
  ),
  "utf8"
);

test(
  "APK map runtime uses embedded config and terrain fallback",
  () => {
    assert.equal(
      template.includes(
        "__MAP_VIEW_CONFIG_JSON__"
      ),
      true
    );
    assert.equal(
      template.includes(
        'fetch("map-view.v1.json"'
      ),
      false
    );
    assert.equal(
      template.includes(
        'id="terrainFallback"'
      ),
      true
    );
    assert.equal(
      template.includes(
        'assets/map/base-terrain.webp'
      ),
      true
    );
    assert.equal(
      template.includes(
        'assets/map/terrain/z'
      ),
      true
    );
    assert.equal(
      template.includes(
        "renderTerrainTiles"
      ),
      true
    );
    assert.equal(
      template.includes(
        "terrainTileFailed"
      ),
      true
    );
  }
);
