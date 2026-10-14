import assert from "node:assert/strict";
import { test } from "node:test";
import { BY_ID } from "../src/engine/exercises.js";
import { isNewBest } from "../src/engine/progression.js";

const S = (...sets) => ({ sets: sets.map(([w, reps]) => ({ w, reps })) });
const pu = BY_ID.pushup;
const bb = BY_ID["bb-bench"];

test("bodyweight modes are not compared across", () => {
  assert.equal(isNewBest(pu, [S([10, 10]), S([10, 10])], S([0, 15])), false);
  assert.equal(isNewBest(pu, [S([10, 10])], S([0, 20], [10, 8])), false);
  assert.equal(isNewBest(pu, [S([0, 20])], S([25, 12])), false);
});

test("bodyweight compares every earlier same-mode session", () => {
  assert.equal(isNewBest(pu, [S([0, 20]), S([10, 10])], S([0, 21])), true);
  assert.equal(isNewBest(pu, [S([0, 20]), S([10, 10])], S([0, 20])), false);
  assert.equal(isNewBest(pu, [S([0, 30], [10, 10])], S([10, 11])), true);
  assert.equal(isNewBest(pu, [S([0, 30], [10, 10])], S([10, 10])), false);
});

test("loaded lifts use Epley e1RM against the best earlier session", () => {
  const h = [S([135, 8])];
  assert.equal(isNewBest(bb, h, S([140, 8])), true);
  assert.equal(isNewBest(bb, h, S([135, 8])), false);
  assert.equal(isNewBest(bb, h, S([145, 5])), false);
  assert.equal(isNewBest(bb, h, S([150, 5])), true);
  assert.equal(isNewBest(bb, [S([135, 8]), S([100, 5])], S([140, 5])), false);
  assert.equal(isNewBest(bb, [], S([140, 8])), false);
  assert.equal(isNewBest(bb, [{ sets: [] }], S([140, 8])), false);
  assert.equal(isNewBest(bb, [S([0, 12])], S([20, 5])), true);
});
