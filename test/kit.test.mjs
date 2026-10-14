import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BAR, DEFAULT_PLATES, kitFor, platesPerSide } from "../src/engine/routine.js";

test("platesPerSide uses only the plates given, largest first", () => {
  assert.deepEqual(platesPerSide(225, "lb", 45, [25, 10]), { plates: [25, 25, 25, 10], remainder: 5 });
  assert.deepEqual(platesPerSide(190, "lb", 45, [45, 25, 10, 5]), { plates: [45, 25], remainder: 2.5 });
  assert.deepEqual(platesPerSide(190, "lb", 45, [5, 45, 10, 25, 25]), { plates: [45, 25], remainder: 2.5 });
  assert.deepEqual(platesPerSide(100, "kg", 15, [20, 10, 5, 2.5]), { plates: [20, 20, 2.5], remainder: 0 });
});

test("platesPerSide uses the bar argument", () => {
  assert.deepEqual(platesPerSide(185, "lb", 35), { plates: [45, 25, 5], remainder: 0 });
  assert.equal(platesPerSide(30, "lb", 35, [45]), null);
  assert.deepEqual(platesPerSide(35, "lb", 35, [45]), { plates: [], remainder: 0 });
});

test("platesPerSide falls back to the standard set without usable plates", () => {
  assert.deepEqual(platesPerSide(102.5, "kg", 20, []), { plates: [25, 15, 1.25], remainder: 0 });
  assert.deepEqual(platesPerSide(102.5, "kg", 20, [0, -5, "x", NaN]), { plates: [25, 15, 1.25], remainder: 0 });
  assert.deepEqual(platesPerSide(190, "lb"), { plates: [45, 25, 2.5], remainder: 0 });
  assert.deepEqual(platesPerSide(100, "kg").plates, [25, 15]);
});

test("kitFor: defaults, per-field fallback, copies", () => {
  assert.deepEqual(DEFAULT_BAR, { lb: 45, kg: 20 });
  assert.deepEqual(kitFor({}, "lb"), { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] });
  assert.deepEqual(kitFor(undefined, "kg"), { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] });
  const own = { bar: { lb: 35, kg: 15 }, plates: { lb: [5, 45, 25], kg: [] } };
  assert.deepEqual(kitFor(own, "lb"), { bar: 35, plates: [45, 25, 5] });
  assert.deepEqual(kitFor(own, "kg"), { bar: 15, plates: DEFAULT_PLATES.kg });
  const bad = { bar: { lb: 0, kg: "15" }, plates: { lb: [0, -1], kg: [20, 20, 10] } };
  assert.deepEqual(kitFor(bad, "lb"), { bar: 45, plates: DEFAULT_PLATES.lb });
  assert.deepEqual(kitFor(bad, "kg"), { bar: 20, plates: [20, 10] });
  assert.equal(kitFor({ bar: { lb: 15 } }, "kg").bar, 20);
  kitFor({}, "lb").plates.push(99);
  assert.deepEqual(DEFAULT_PLATES.lb, [45, 35, 25, 10, 5, 2.5]);
});
