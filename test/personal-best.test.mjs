import assert from "node:assert/strict";
import { test } from "node:test";
import { BY_ID } from "../src/engine/exercises.js";
import { personalBest } from "../src/engine/progression.js";

const S = (date, ...sets) => ({ date, sets: sets.map(([w, reps]) => ({ w, reps })) });
const pu = BY_ID.pushup;
const bb = BY_ID["bb-bench"];
const near = (r, score, date, unit) => {
  assert.ok(Math.abs(r.score - score) < 1e-6);
  assert.equal(r.date, date);
  assert.equal(r.unit, unit);
};

test("best session, not first or last", () => {
  assert.deepEqual(personalBest(bb, [S("d1", [135, 8]), S("d2", [150, 5]), S("d3", [140, 5])]), { score: 175, date: "d2", unit: "load" });
});

test("best set within a session counts even when not last", () => {
  assert.deepEqual(personalBest(bb, [S("d1", [120, 5], [100, 10])]), { score: 140, date: "d1", unit: "load" });
});

test("a tie keeps the earliest session", () => {
  assert.deepEqual(personalBest(bb, [S("d1", [135, 8]), S("d2", [135, 8])]), { score: 171, date: "d1", unit: "load" });
});

test("bodyweight uses the latest session's mode", () => {
  assert.deepEqual(personalBest(pu, [S("d1", [0, 20]), S("d2", [10, 10]), S("d3", [0, 18])]), { score: 20, date: "d1", unit: "reps" });
  near(personalBest(pu, [S("d1", [0, 30]), S("d2", [10, 10]), S("d3", [0, 5], [15, 8])]), 19, "d3", "load");
  near(personalBest(pu, [S("d1", [0, 30]), S("d2", [10, 10]), S("d3", [0, 25], [15, 8])]), 19, "d3", "load");
});

test("an empty session does not set the mode", () => {
  assert.deepEqual(personalBest(pu, [S("d1", [0, 20]), S("d2")]), { score: 20, date: "d1", unit: "reps" });
  near(personalBest(pu, [S("d1", [0, 20]), S("d2", [10, 10]), S("d3")]), 40 / 3, "d2", "load");
});

test("only bodyweight lifts have modes", () => {
  near(personalBest(bb, [S("d1", [20, 5]), S("d2", [0, 12])]), 70 / 3, "d1", "load");
});

test("no sessions with sets gives null", () => {
  assert.equal(personalBest(bb, []), null);
  assert.equal(personalBest(pu, [S("d1")]), null);
});
