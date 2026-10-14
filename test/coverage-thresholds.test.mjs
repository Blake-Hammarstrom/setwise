import assert from "node:assert/strict";
import { test } from "node:test";
import { SESSION_CAP, targets } from "../src/engine/generator.js";
import { coverage } from "../src/engine/routine.js";

const T = targets("intermediate");
const day = (name, sets, id = "bb-bench") => ({ name, items: [{ id, sets, reps: [5, 8] }] });
const days = (n, sets) => ({ days: Array.from({ length: n }, (_, i) => day(`D${i + 1}`, sets)) });

test("short: strictly below the weekly minimum", () => {
  assert.deepEqual(T.chest, [12, 18]);
  assert.ok(coverage({ days: [day("A", 11)] }, T, 1).short.includes("chest"));
  assert.ok(!coverage({ days: [day("A", 12)] }, T, 1).short.includes("chest"));
});

test("over: more than 2 sets above the weekly maximum", () => {
  assert.ok(!coverage(days(4, 5), T, 4).over.includes("chest")); // 20 sets
  assert.ok(coverage(days(3, 7), T, 3).over.includes("chest")); // 21 sets
});

test("heavyDays: only when one session exceeds SESSION_CAP sets", () => {
  assert.equal(SESSION_CAP, 10);
  assert.deepEqual(coverage({ days: [day("Push", 10)] }, T, 1).heavyDays, []);
  assert.deepEqual(coverage({ days: [day("Push", 11)] }, T, 1).heavyDays, [{ day: "Push", muscle: "chest", sets: 11 }]);
});

test("weekly sets scale by perWeek / days, round to 0.1, count secondaries at 0.5", () => {
  const r = { days: [day("A", 1), { name: "B", items: [] }, { name: "C", items: [] }] };
  const { weekly } = coverage(r, T, 2);
  assert.equal(weekly.chest, 0.7);
  assert.equal(weekly.triceps, 0.3);
});

test("unknown exercise id contributes nothing and does not throw", () => {
  const cov = coverage({ days: [day("A", 5, "no-such-exercise")] }, T, 1);
  assert.ok(Object.values(cov.weekly).every((v) => v === 0));
  assert.deepEqual(cov.heavyDays, []);
});
