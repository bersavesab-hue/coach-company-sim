import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const template = fs.readFileSync(
  path.resolve("presentation/apk/index.template.html"),
  "utf8"
);

test("APK forces persistence when the WebView is backgrounded or left", () => {
  assert.equal(
    template.includes("if(document.hidden)CoachGame.persistNow()"),
    true
  );
  assert.equal(
    template.includes('window.addEventListener("pagehide"'),
    true
  );
});
