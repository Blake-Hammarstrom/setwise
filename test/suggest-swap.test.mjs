import assert from "node:assert/strict";
import { test } from "node:test";
import { PROFILES } from "../src/engine/exercises.js";
import { makeCustomExercise, suggestSwap } from "../src/engine/routine.js";

const hist = (...ws) => ws.map((w) => ({ sets: [{ w, reps: 5 }] }));
const com = PROFILES.commercial.equipment;
const dbp = PROFILES.dumbbell.equipment;
const flat = hist(100, 100, 100, 100, 100);

test("not stalled gives null", () => {
  assert.equal(suggestSwap("bb-bench", hist(100, 100, 100, 100, 105), com), null);
  assert.equal(suggestSwap("bb-bench", hist(100, 100, 100, 100), com), null);
  assert.equal(suggestSwap("bb-bench", [], com), null);
  assert.equal(suggestSwap("no-such-lift", flat, com), null);
});

test("stalled gives the first like-for-like alternative", () => {
  assert.equal(suggestSwap("bb-bench", flat, com), "db-bench");
  assert.equal(suggestSwap("bb-bench", hist(110, 100, 100, 100, 100), com), "db-bench");
});

test("exclude and equipment are respected", () => {
  assert.equal(suggestSwap("bb-bench", flat, com, [], ["db-bench"]), "machine-press");
  assert.equal(suggestSwap("bb-bench", flat, com, [], ["db-bench", "machine-press", "pushup"]), "bb-incline");
  assert.equal(suggestSwap("bb-bench", flat, dbp, [], ["db-bench", "pushup"]), "db-incline");
});

test("custom exercises are candidates", () => {
  const ex = ["pushup", "deficit-pushup"];
  assert.equal(suggestSwap("bb-bench", flat, [], [], ex), null);
  const c = makeCustomExercise({ name: "Plate press", primary: ["chest"] }, 1);
  assert.equal(suggestSwap("bb-bench", flat, [], [c], ex), "c-plate-press-1");
});
