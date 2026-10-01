// Routine parser on constructed inputs in the three ways people bring a routine: typed, copied from a photo (Live Text
// keeps bullets, odd dashes and "x" variants), and dictated (run-on, number words). Constructed by the author:
// evidence the parser works on these shapes, not a measure of real-world accuracy.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PROFILES } from "../src/engine/exercises.js";
import { CONFIDENT, matchExercise, parseRoutine, setsReps } from "../src/engine/parse.js";

const eq = PROFILES.commercial.equipment;
const ids = (r) => r.days.map((d) => [d.name, d.items.map((i) => i.id)]);

test("sets × reps in every common form", () => {
  const cases = [["Bench 3x8", 3, [8, 8]], ["Bench 4 x 6-8", 4, [6, 8]], ["bench 4×6–8", 4, [6, 8]], ["Bench 3 sets of 10", 3, [10, 10]],
    ["bench three sets of ten", 3, [10, 10]], ["bench 3 by 12", 3, [12, 12]], ["bench 4 sets 8 to 10 reps", 4, [8, 10]], ["bench 8-12 reps", null, [8, 12]], ["bench", null, null]];
  for (const [s, sets, reps] of cases) { const r = setsReps(s); assert.equal(r.sets, sets, s); assert.deepEqual(r.reps, reps, s); }
});

test("typed multi-day list", () => {
  const r = parseRoutine("Push:\nBench press 4x6-8\nIncline DB press 3x10\nOHP 3 x 8\nLateral raises 4x15\nSkull crushers 3x12\nTricep pushdowns 3x12-15\n\nPull\n- Pull ups 4x8\n- Barbell row 4x8\n- Lat pulldown 3x10-12\n- Face pulls 3x15\n- Hammer curls 3x12\n\nLegs\nSquat 5x5\nRDL 3x8\nLeg press 3x12\nLeg curl 3x12", eq);
  assert.deepEqual(ids(r), [
    ["Push", ["bb-bench", "db-incline", "ohp", "db-lateral", "skullcrusher", "pushdown"]],
    ["Pull", ["pullup", "bb-row", "lat-pulldown", "face-pull", "db-curl"]],
    ["Legs", ["back-squat", "rdl", "leg-press", "leg-curl"]]]);
  assert.ok(r.days.flatMap((d) => d.items).every((i) => i.confidence >= CONFIDENT));
});

test("Live Text style: bullets, numbered lines, inline day headings, semicolons", () => {
  const r = parseRoutine("Day 1 - Upper: bench 3x8, rows 3x10, ohp 3x8, curls 3x12; Day 2 - Lower: back squat 4x6, rdl 3x10, leg extensions 3x15\n1. Monday\n• Chest press machine 3x10\n• Pec deck 3 sets 12-15 reps", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Day 1 - Upper", "Day 2 - Lower", "Monday"]);
  assert.deepEqual(r.days[1].items.map((i) => i.id), ["back-squat", "rdl", "leg-ext"]);
  assert.deepEqual(r.days[2].items.map((i) => i.id), ["machine-press", "pec-deck"]);
  assert.deepEqual(r.days[2].items[1].reps, [12, 15]);
});

test("dictation: one run-on sentence with number words, 'then/next' and spoken day names", () => {
  const r = parseRoutine("push day bench press three sets of eight then incline dumbbell press three by ten then lateral raises four sets of fifteen next pull day pull ups three sets of eight then barbell rows three by ten then bicep curls three by twelve", eq);
  assert.deepEqual(ids(r), [["Push Day", ["bb-bench", "db-incline", "db-lateral"]], ["Pull Day", ["pullup", "bb-row", "db-curl"]]]);
  assert.deepEqual(r.days[0].items[0], { ...r.days[0].items[0], sets: 3, reps: [8, 8] });
});

test("exercise names that start with a day word are exercises, not headings", () => {
  const r = parseRoutine("Back\nBack squat 3x5\nChest press machine 3x10\nShoulder press 3x8", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Back"]);
  assert.equal(r.days[0].items.length, 3);
  assert.equal(r.days[0].items[0].id, "back-squat");
});

test("unknown exercises are flagged, never silently guessed with confidence", () => {
  const r = parseRoutine("Legs\nZercher good morning 3x8\nLeg press 3x12", eq);
  const z = r.days[0].items[0];
  assert.ok(!z.id || z.confidence < CONFIDENT, `"Zercher good morning" must be flagged, got ${z.id} @ ${z.confidence}`);
  assert.equal(matchExercise("tricep pushdown", eq).id, "pushdown");
  assert.equal(parseRoutine("warm up 10 min bike\n\n").days.length, 0);
});
