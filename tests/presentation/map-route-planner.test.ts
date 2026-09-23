import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve(
    "presentation/apk/index.template.html"
  ),
  "utf8"
);

test(
  "map route planner is the canonical new-route interaction",
  () => {
    assert.equal(
      template.includes(
        'onclick="startMapRoutePlanning()"'
      ),
      true
    );
    assert.equal(
      template.includes(
        'id="routePlanner"'
      ),
      true
    );
    assert.equal(
      template.includes(
        "CoachGame.previewRoute"
      ),
      true
    );
    assert.equal(
      template.includes(
        "routePreviewLine"
      ),
      true
    );
    assert.equal(
      template.includes(
        "selectMapStation"
      ),
      true
    );
    assert.equal(
      template.includes(
        'onclick="openPage(\'routes\')">＋ 新建线路'
      ),
      false
    );
  }
);


test(
  "map route planner inline script parses",
  () => {
    const scripts = [
      ...template.matchAll(
        /<script>([\s\S]*?)<\/script>/g
      )
    ];
    assert.ok(scripts.length > 0);
    const inline =
      scripts[scripts.length - 1]![1]!
        .replace(
          "__MAP_VIEW_CONFIG_JSON__",
          "{}"
        );
    assert.doesNotThrow(
      () => new vm.Script(inline)
    );
  }
);
