import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("privacy: the app can't connect anywhere, ships no third-party code, and uses no inline styles or scripts", () => {
  const html = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ""), /<script[^>]+src="https?:|<script>(?!<\/script>)|style="/);
  const app = readFileSync(new URL("../src/app/main.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
  assert.doesNotMatch(app, /style="/);
});
