import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("in-game UI designer has persistent recoverable layout controls", () => {
  for (const token of [
    "coach-company-sim.ui-layout.v1",
    "function openUiDesigner",
    "function closeUiDesigner",
    "function uiMoveSelected",
    "function uiSetWidth",
    "function uiScaleSelected",
    "function uiToggleHiddenSelected",
    "function uiResetSelected",
    "function uiResetAll",
    "function uiExportLayout",
    "function uiImportLayout"
  ]) {
    assert.equal(template.includes(token), true);
  }
  assert.equal(
    template.includes("state.hidden&&!uiDesignMode"),
    true
  );
});

test("map presentation widgets are directly draggable in design mode", () => {
  for (const id of [
    "map.hud",
    "map.layers",
    "map.controls",
    "map.legend",
    "map.time",
    "map.newRoute"
  ]) {
    assert.equal(
      template.includes(`data-ui-edit="${id}"`),
      true
    );
  }
  assert.equal(
    template.includes("[data-ui-edit][data-ui-free]"),
    true
  );
});

test("designer does not mark bottom navigation as deletable", () => {
  const navStart = template.indexOf('<nav id="nav">');
  const navEnd = template.indexOf("</nav>", navStart);
  assert.ok(navStart >= 0 && navEnd > navStart);
  assert.equal(
    template.slice(navStart, navEnd).includes("data-ui-edit"),
    false
  );
});

test("UI designer inline script parses", () => {
  const scripts = [
    ...template.matchAll(/<script>([\s\S]*?)<\/script>/g)
  ];
  assert.ok(scripts.length > 0);
  const inline = scripts[scripts.length - 1]![1]!
    .replace("__MAP_VIEW_CONFIG_JSON__", "{}");
  assert.doesNotThrow(() => new vm.Script(inline));
});

test("designer supports style image and safe custom component editing", () => {
  for (const token of [
    "function uiAdjustFont",
    "function uiAdjustOpacity",
    "function uiAdjustRadius",
    "function uiApplyColor",
    "function uiChooseBackground",
    "function uiCompressImage",
    "function uiAddText",
    "function uiAddImage",
    "function uiAddDataCard",
    "function uiRemoveCustomSelected",
    "function uiExportCleanup"
  ]) {
    assert.equal(template.includes(token), true);
  }
  assert.equal(template.includes("const UI_BINDINGS={"), true);
  assert.equal(template.includes("eval("), false);
  assert.equal(template.includes("data-ui-custom"), true);
  assert.equal(
    template.includes("style.radius ?? (parseFloat"),
    true
  );
});

test("designer image input accepts only images", () => {
  assert.equal(
    template.includes('id="uiImageInput"'),
    true
  );
  assert.equal(
    template.includes('accept="image/*"'),
    true
  );
});
