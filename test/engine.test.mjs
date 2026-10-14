import assert from "node:assert/strict";
import { test } from "node:test";
import { BY_ID, EXERCISES, PROFILES, available } from "../src/engine/exercises.js";
import { planWeek, suggestFits } from "../src/engine/generator.js";
import { e1rm, prescribe, stalled } from "../src/engine/progression.js";

const S = (w, ...reps) => ({ date: "x", sets: reps.map((r) => ({ w, reps: r })) });
const bench = BY_ID["bb-bench"], squat = BY_ID["back-squat"], db = BY_ID["db-curl"], pushup = BY_ID["pushup"];

test.skip("library: every exercise is well-formed", () => {
  for (const e of EXERCISES) {
    assert.ok(e.primary.length && e.reps[0] < e.reps[1] && e.equipment.length, e.id);
    assert.ok(!e.primary.some((m) => e.secondary.includes(m)), `${e.id}: a muscle can't be both`);
  }
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});

test("R5 first exposure: no load prescribed, ask for a 2-in-reserve weight", () => {
  const r = prescribe(bench, []);
  assert.equal(r.load, null);
  assert.equal(r.change, "first");
});

test("R1 double progression: all sets at the top → one increment (by equipment, body half and units)", () => {
  assert.equal(prescribe(bench, [S(185, 8, 8, 8)]).load, 190);
  assert.equal(prescribe(squat, [S(225, 8, 8, 8)]).load, 235);
  assert.equal(prescribe(squat, [S(100, 8, 8, 8)], "kg").load, 105);
  assert.equal(prescribe(db, [S(30, 15, 15, 15)]).load, 35);
});

test("R2 hold: not every set at the top → same load", () => {
  const r = prescribe(bench, [S(185, 8, 7, 6)]);
  assert.equal(r.load, 185);
  assert.equal(r.change, "hold");
});

test("R3 reduce: two consecutive sessions entirely below the range → −10%, rounded to the increment", () => {
  const r = prescribe(bench, [S(200, 4, 4, 3), S(200, 4, 3, 3)]);
  assert.equal(r.load, 180);
  assert.equal(r.change, "down");
  assert.equal(prescribe(bench, [S(200, 6, 6, 6), S(200, 4, 3, 3)]).change, "hold"); // only one bad session
});

test("bodyweight: top of range on every set → harder variation", () => {
  assert.equal(prescribe(pushup, [S(0, 20, 20, 20)]).change, "variation");
  assert.equal(prescribe(pushup, [S(0, 15, 12, 10)]).change, "hold");
});

test("R4 stall: no new best estimated 1RM in 4 exposures", () => {
  const rising = [S(185, 6, 6), S(185, 7, 6), S(185, 8, 7), S(190, 6, 6), S(190, 7, 6), S(190, 8, 7)];
  assert.equal(stalled(bench, rising), false);
  const flat = [S(185, 8, 8), S(185, 7, 7), S(185, 6, 6), S(185, 7, 6), S(185, 8, 7)];
  assert.equal(stalled(bench, flat), true);
  assert.ok(Math.abs(e1rm(185, 8) - 234.33) < 0.01);
});

test("generator: equipment-safe, deterministic, honest shortfalls, fit advice", () => {
  const p = { split: "ppl", days: 3, minutes: 60, experience: "intermediate", equipment: PROFILES.home.equipment };
  const w = planWeek(p);
  assert.deepEqual(w, planWeek(p));
  assert.ok(w.sessions.every((s) => s.items.every((i) => available(BY_ID[i.id], p.equipment))));
  assert.ok(w.shortfalls.length && w.shortfalls.every((s) => s.reasons.length));
  assert.ok(suggestFits(p).every((f) => !planWeek({ ...p, ...f }).shortfalls.length));
  assert.throws(() => planWeek({ ...p, days: 5 }), /isn't offered/);
});
