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

test("slash-separated day patterns (Upper/Lower, Push/Pull, Legs + Core, Chest & Back)", () => {
  const r = parseRoutine("Upper/Lower\nBench 3x8\nPush/Pull\nOHP 3x8\nPull-ups 3x6\nLegs + Core\nSquat 5x5\nChest & Back\nRows 3x10", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Upper/Lower", "Push/Pull", "Legs + Core", "Chest & Back"]);
  assert.equal(r.days[0].items[0].id, "bb-bench");
  assert.equal(r.days[1].items.length, 2);
});

test("Upper Body, Lower Body, and Full Body headings", () => {
  const r = parseRoutine("Upper Body\nBench 3x8\nLower Body\nSquat 5x5\nFull Body\nRows 3x10", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Upper Body", "Lower Body", "Full Body"]);
  assert.equal(r.days[0].items[0].id, "bb-bench");
  assert.equal(r.days[1].items[0].id, "back-squat");
  assert.equal(r.days[2].items[0].id, "bb-row");
});

test("Workout A, Workout B, and Workout A/B headings", () => {
  const r = parseRoutine("Workout A\nBench 3x8\nWorkout B\nSquat 5x5\nWorkout A/B\nRows 3x10", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Workout A", "Workout B", "Workout A/B"]);
  assert.equal(r.days[0].items[0].id, "bb-bench");
  assert.equal(r.days[2].items[0].id, "bb-row");
});

test("muscle-group headings joined by &, 'and', /, or + (Chest & Triceps, Back and Biceps, Chest/Tris, Shoulders + Arms)", () => {
  const r = parseRoutine("Chest & Triceps\nBench 3x8\nBack and Biceps\nRows 3x10\nChest/Tris\nDips 3x10\nShoulders + Arms\nOHP 3x8", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Chest & Triceps", "Back And Biceps", "Chest/Tris", "Shoulders + Arms"]);
  assert.equal(r.days[0].items[0].id, "bb-bench");
  assert.equal(r.days[1].items[0].id, "bb-row");
  assert.equal(r.days[2].items[0].id, "dip");
  assert.equal(r.days[3].items[0].id, "ohp");
});

test("Week N Day N patterns with labels", () => {
  const r = parseRoutine("Week 1 Day 1 - Upper\nBench 3x8\nWeek 1 Day 2 - Lower\nSquat 5x5", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Week 1 Day 1 - Upper", "Week 1 Day 2 - Lower"]);
  assert.equal(r.days[0].items[0].id, "bb-bench");
});

test("'Day N: Label' and 'Day N - Label' treat the label as part of the day name, not an exercise", () => {
  const r = parseRoutine("Day 1: Chest\nBench press 3x8\nDay 2 - Back\nRows 3x10", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Day 1: Chest", "Day 2 - Back"]);
  assert.equal(r.days[0].items.length, 1);
  assert.equal(r.days[0].items[0].id, "bb-bench");
  assert.equal(r.days[1].items.length, 1);
  assert.equal(r.days[1].items[0].id, "bb-row");
});

test("'Push: bench 3x8' stays a heading plus a bench exercise on one line", () => {
  const r = parseRoutine("Push: bench 3x8", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Push"]);
  assert.equal(r.days[0].items.length, 1);
  assert.equal(r.days[0].items[0].id, "bb-bench");
});

test("superset labels (A1., A2), B1., 1a.) are stripped with the same confidence as the unlabeled exercise", () => {
  const plainBench = matchExercise("bench press", eq);
  const plainRow = matchExercise("rows", eq);
  const plainOhp = matchExercise("ohp", eq);
  const plainCurl = matchExercise("bicep curls", eq);
  const r = parseRoutine("Upper\nA1. Bench press 3x8\nA2) Rows 3x8\nB1. OHP 3x8\n1a. Bicep curls 3x12", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Upper"]);
  assert.deepEqual(r.days[0].items.map((i) => i.id), ["bb-bench", "bb-row", "ohp", "db-curl"]);
  assert.equal(r.days[0].items[0].confidence, plainBench.confidence);
  assert.equal(r.days[0].items[1].confidence, plainRow.confidence);
  assert.equal(r.days[0].items[2].confidence, plainOhp.confidence);
  assert.equal(r.days[0].items[3].confidence, plainCurl.confidence);
});

test("exercises that look like headings stay exercises: Back squat, Chest press machine, Shoulder press, Leg press, Chest fly", () => {
  const r = parseRoutine("Back squat 3x5\nChest press machine 3x10\nShoulder press 3x8\nLeg press 3x12\nChest fly 3x12", eq);
  assert.deepEqual(r.days.map((d) => d.name), ["Day 1"]);
  assert.deepEqual(r.days[0].items.map((i) => i.id), ["back-squat", "machine-press", "db-ohp", "leg-press", "band-fly"]);
});
