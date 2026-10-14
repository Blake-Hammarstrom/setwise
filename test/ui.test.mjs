import assert from "node:assert/strict";
import { test } from "node:test";
import { esc, r1, fmtTime } from "../src/app/ui.js";

test("esc: escapes HTML special characters", () => {
  assert.equal(esc(`<a href="x" onclick='y'>&</a>`), "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("esc: returns empty string for null and undefined", () => {
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

test("esc: converts numbers to strings", () => {
  assert.equal(esc(0), "0");
  assert.equal(esc(42), "42");
});

test("esc: escapes already-escaped text", () => {
  assert.equal(esc("&amp;"), "&amp;amp;");
});

test("r1: rounds to one decimal place", () => {
  assert.equal(r1(1.25), 1.3);
  assert.equal(r1(1.24), 1.2);
  assert.equal(r1(2), 2);
});

test("fmtTime: formats seconds as m:ss", () => {
  assert.equal(fmtTime(90), "1:30");
  assert.equal(fmtTime(60), "1:00");
  assert.equal(fmtTime(59), "0:59");
  assert.equal(fmtTime(0), "0:00");
  assert.equal(fmtTime(600), "10:00");
});
