import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.resolve(
    "android-app/app/src/main/java/com/coachcompany/sim/MainActivity.java"
  ),
  "utf8"
);

test("Android WebView exposes a user-initiated image chooser to UI designer", () => {
  assert.equal(source.includes("WebChromeClient"), true);
  assert.equal(source.includes("onShowFileChooser"), true);
  assert.equal(source.includes('intent.setType("image/*")'), true);
  assert.equal(source.includes("FILE_CHOOSER_REQUEST"), true);
  assert.equal(source.includes("parseResult"), true);
});
