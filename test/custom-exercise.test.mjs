import assert from "node:assert/strict";
import { test } from "node:test";
import { makeCustomExercise } from "../src/engine/routine.js";

const mk = (o, now = 1) => makeCustomExercise({ name: "X", ...o }, now);

test("makeCustomExercise: a muscle ticked as both primary and secondary is one muscle (isolation)", () => {
  const ex = makeCustomExercise({ name: "Pec fly", primary: ["chest"], secondary: ["chest"] }, 1);
  assert.deepEqual(ex.secondary, []);
  assert.equal(ex.kind, "isolation");
});

test("makeCustomExercise: kind counts distinct muscles", () => {
  assert.equal(mk({ primary: ["chest"], secondary: ["chest", "triceps"] }).kind, "compound");
  assert.equal(mk({ primary: ["chest", "triceps"] }).kind, "compound");
  assert.equal(mk({ primary: ["chest"] }).kind, "isolation");
});

test("makeCustomExercise: unknown muscles are rejected", () => {
  assert.throws(() => mk({ primary: ["wings"] }), { message: "Unknown muscle." });
  assert.throws(() => mk({ primary: ["chest"], secondary: ["wings"] }), { message: "Unknown muscle." });
});

test("makeCustomExercise: rep range and name validation", () => {
  for (const reps of [[0, 5], [8, 8], [8, 51], ["a", 12]]) {
    assert.throws(() => mk({ primary: ["chest"], reps }), { message: "Rep range must be like 8–12." });
  }
  assert.deepEqual(mk({ primary: ["chest"], reps: [1, 2] }).reps, [1, 2]);
  assert.deepEqual(mk({ primary: ["chest"], reps: [8, 50] }).reps, [8, 50]);
  assert.throws(() => makeCustomExercise({ name: "   ", primary: ["chest"] }, 1), { message: "Give it a name." });
});

test("makeCustomExercise: builds the exercise, id and lower flag", () => {
  assert.deepEqual(makeCustomExercise({ name: "  Pec Deck!  ", primary: ["chest"] }, 1760000000000), {
    id: "c-pec-deck-mgj6k3cw", name: "Pec Deck!", equipment: ["floor"], primary: ["chest"], secondary: [], pattern: "custom-chest",
    load: "machine", lower: false, tier: "accessory", reps: [8, 12], kind: "isolation" });
  assert.equal(makeCustomExercise({ name: "!!!", primary: ["chest"] }, 35).id, "c-exercise-z");
  assert.equal(makeCustomExercise({ name: "A very long exercise name that keeps going", primary: ["chest"] }, 36).id, "c-a-very-long-exercise-name-that-10");
  assert.equal(mk({ primary: ["chest"], lower: 1 }).lower, true);
});
