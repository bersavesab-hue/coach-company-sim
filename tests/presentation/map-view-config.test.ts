import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const configPath = path.resolve(
  "presentation/apk/map-view.v1.json"
);
const config = JSON.parse(
  fs.readFileSync(configPath, "utf8")
) as {
  schemaVersion: number;
  viewBox: {
    width: number;
    height: number;
  };
  camera: {
    defaultRatio: number;
    minRatio: number;
  };
  lod: Array<{
    detail: number;
    minCameraRatio: number;
  }>;
  terrain: {
    source: {
      width: number;
      height: number;
    };
    calibration: {
      offsetX: number;
      offsetY: number;
      scaleX: number;
      scaleY: number;
    };
    levels: Array<{
      level: number;
      cols: number;
      rows: number;
      width: number;
      height: number;
      maxDetail: number;
    }>;
  };
};

test(
  "formal map view config keeps terrain pyramid and LOD aligned",
  () => {
    assert.equal(config.schemaVersion, 1);
    assert.deepEqual(
      config.lod.map((item) => item.detail),
      [0, 1, 2, 3]
    );
    assert.deepEqual(
      config.lod.map(
        (item) => item.minCameraRatio
      ),
      [0.72, 0.48, 0.3, 0]
    );

    assert.equal(
      config.viewBox.width *
        config.terrain.source.height,
      config.viewBox.height *
        config.terrain.source.width
    );
    assert.equal(
      config.camera.defaultRatio >=
        config.camera.minRatio,
      true
    );
    assert.equal(
      config.camera.minRatio,
      0.25
    );

    const levels =
      config.terrain.levels;
    assert.deepEqual(
      levels.map((level) => ({
        level: level.level,
        cols: level.cols,
        rows: level.rows,
        maxDetail: level.maxDetail
      })),
      [
        {
          level: 0,
          cols: 1,
          rows: 1,
          maxDetail: 0
        },
        {
          level: 1,
          cols: 2,
          rows: 2,
          maxDetail: 1
        },
        {
          level: 2,
          cols: 4,
          rows: 3,
          maxDetail: 3
        }
      ]
    );
    assert.equal(
      levels.reduce(
        (total, level) =>
          total +
          level.cols * level.rows,
        0
      ),
      17
    );

    const nativeLevel =
      levels[levels.length - 1];
    assert.ok(nativeLevel);
    assert.equal(
      nativeLevel.width,
      config.terrain.source.width
    );
    assert.equal(
      nativeLevel.height,
      config.terrain.source.height
    );

    for (const level of levels) {
      assert.equal(
        level.width % level.cols,
        0
      );
      assert.equal(
        level.height % level.rows,
        0
      );
    }

    assert.equal(
      config.terrain.calibration.scaleX > 0,
      true
    );
    assert.equal(
      config.terrain.calibration.scaleY > 0,
      true
    );
  }
);
