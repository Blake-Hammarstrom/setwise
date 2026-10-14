import assert from "node:assert/strict";
import { test } from "node:test";
import { PROFILES } from "../src/engine/exercises.js";
import { block, historyOf, needsBackup, nextIndex, sessionsOf } from "../src/app/state.js";

const DAY = 86400000;
const logs = (n) => Array.from({ length: n }, () => ({ date: "2026-01-01", dayIndex: 0, items: [] }));
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();

test("needsBackup: needs 5 logs, then a missing or stale backup", () => {
  assert.equal(needsBackup({ logs: logs(4) }), false);
  assert.equal(needsBackup({ logs: logs(5) }), true);
  assert.equal(needsBackup({ logs: logs(5), lastBackup: ago(13) }), false);
  assert.equal(needsBackup({ logs: logs(5), lastBackup: ago(15) }), true);
});

test("nextIndex: follows the last logged day, wraps, and falls back to the log count", () => {
  assert.equal(nextIndex({}, 3), 0);
  assert.equal(nextIndex({ logs: [] }, 3), 0);
  assert.equal(nextIndex({ logs: [{ dayIndex: 0 }, { dayIndex: 1 }] }, 3), 2);
  assert.equal(nextIndex({ logs: [{ dayIndex: 2 }] }, 3), 0);
  assert.equal(nextIndex({ logs: [{ dayIndex: 0 }, { dayIndex: 1 }, { dayIndex: 1 }, {}] }, 3), 1);
  assert.equal(nextIndex({ logs: [{ dayIndex: 0 }, { dayIndex: "1" }] }, 3), 2);
});

test("historyOf: only sessions with sets for the exercise, in log order", () => {
  const a = [{ w: 50, reps: 8 }], b = [{ w: 55, reps: 6 }, { w: 55, reps: 5 }];
  const s = { logs: [
    { date: "d1", items: [{ id: "bb-bench", sets: a }, { id: "db-curl", sets: b }] },
    { date: "d2", items: [{ id: "db-curl", sets: b }] },
    { date: "d3", items: [{ id: "bb-bench", sets: [] }] },
    { date: "d4", items: [{ id: "bb-bench", sets: b }] },
  ] };
  assert.deepEqual(historyOf(s, "bb-bench"), [{ date: "d1", sets: a }, { date: "d4", sets: b }]);
  assert.deepEqual(historyOf(s, "nope"), []);
  assert.deepEqual(historyOf({}, "bb-bench"), []);
});

test("block: a missing or invalid startedAt counts as block 0", () => {
  assert.equal(block({}), 0);
  assert.equal(block({ startedAt: undefined }), 0);
  assert.equal(block({ startedAt: "garbage" }), 0);
});

test("block: counts 28-day blocks since startedAt, never negative", () => {
  assert.equal(block({ startedAt: ago(0) }), 0);
  assert.equal(block({ startedAt: ago(27) }), 0);
  assert.equal(block({ startedAt: ago(29) }), 1);
  assert.equal(block({ startedAt: ago(57) }), 2);
  assert.equal(block({ startedAt: ago(-10) }), 0);
});

test("sessionsOf: a missing startedAt plans the same as starting today", () => {
  const profile = { split: "ppl", days: 3, minutes: 60, experience: "intermediate", equipment: PROFILES.home.equipment, units: "lb", swaps: {} };
  const ids = (s) => sessionsOf(s).map((d) => d.items.map((i) => i.id));
  assert.deepEqual(ids({ profile }), ids({ profile, startedAt: new Date().toISOString() }));
});
