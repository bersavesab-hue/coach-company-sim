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

test("Android back delegates to in-app navigation before leaving WebView", () => {
  assert.equal(source.includes("window.handleNativeBack"), true);
  assert.equal(source.includes("evaluateJavascript"), true);
  assert.equal(source.includes("finishBackNavigation"), true);
  assert.equal(
    source.includes(
      "if (webView != null && webView.canGoBack())"
    ),
    true
  );
});
