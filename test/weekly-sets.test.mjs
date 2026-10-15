import assert from "node:assert/strict";
import { test } from "node:test";
import { MUSCLES } from "../src/engine/exercises.js";
import { weeklySets } from "../src/engine/routine.js";

const now = Date.parse("2026-10-14T12:00:00Z"), D = 86400000;
const log = (id, n, t) => ({ date: typeof t === "string" ? t : new Date(t).toISOString(), items: [{ id, sets: Array.from({ length: n }, () => ({ w: 100, reps: 5 })) }] });
const col = (r, m) => r.map((w) => w.sets[m]);

test("weeklySets buckets logs into four weekly windows", () => {
  const logs = [log("bb-bench", 3, now - D), log("bb-bench", 2, now - 7 * D), log("bb-bench", 4, now - 7 * D - 1), log("db-curl", 3, now - 14 * D - 1),
    log("bb-bench", 5, now - 28 * D), log("bb-bench", 9, now - 28 * D - 1), log("bb-bench", 1, now + 2 * D), log("bb-bench", 7, "garbage"), log("no-such-exercise", 4, now - 2 * D)];
  const r = weeklySets(logs, now, 4);
  assert.deepEqual(r.map((w) => w.start), ["2026-09-16T12:00:00.000Z", "2026-09-23T12:00:00.000Z", "2026-09-30T12:00:00.000Z", "2026-10-07T12:00:00.000Z"]);
  assert.deepEqual(col(r, "chest"), [5, 0, 4, 6]);
  assert.deepEqual(col(r, "triceps"), [2.5, 0, 2, 3]);
  assert.deepEqual(col(r, "frontDelts"), [2.5, 0, 2, 3]);
  assert.deepEqual(col(r, "biceps"), [0, 3, 0, 0]);
  for (const w of r) assert.equal(Object.keys(w.sets).length, 13);
  assert.deepEqual(Object.keys(r[0].sets), [...MUSCLES]);
});

test("weeklySets window boundaries", () => {
  const chest = (n, t) => col(weeklySets([log("bb-bench", n, t)], now, 4), "chest");
  assert.deepEqual(chest(2, now - 7 * D), [0, 0, 0, 2]);
  assert.deepEqual(chest(2, now - 7 * D - 1), [0, 0, 2, 0]);
  assert.deepEqual(chest(5, now - 28 * D), [5, 0, 0, 0]);
  assert.deepEqual(chest(9, now - 28 * D - 1), [0, 0, 0, 0]);
  assert.deepEqual(chest(1, now + 2 * D), [0, 0, 0, 1]);
});

test("weeklySets honours weeks and tolerates missing logs", () => {
  const logs = [log("bb-bench", 3, now - D), log("bb-bench", 4, now - 7 * D - 1), log("bb-bench", 2, now - 7 * D), log("bb-bench", 5, now - 28 * D)];
  assert.deepEqual(col(weeklySets(logs, now, 2), "chest"), [4, 5]);
  assert.equal(weeklySets([], now, 1)[0].sets.chest, 0);
  assert.equal(weeklySets(undefined, now, 1).length, 1);
});
