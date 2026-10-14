import assert from "node:assert/strict";
import { test } from "node:test";
import { BY_ID, EXERCISES, PROFILES, available } from "../src/engine/exercises.js";
import { QUICK_STARTS, planDay, planWeek, targets } from "../src/engine/generator.js";
import { alternatives, applySwaps, coverage, makeCustomExercise, platesPerSide, registerCustom, routineFromPlan, searchExercises, warmups } from "../src/engine/routine.js";

const eq = PROFILES.commercial.equipment;

test("custom exercise: validated, registered, credited like a library exercise", () => {
  assert.throws(() => makeCustomExercise({ name: "", primary: ["chest"] }), /name/);
  assert.throws(() => makeCustomExercise({ name: "X", primary: [] }), /muscle/);
  assert.throws(() => makeCustomExercise({ name: "X", primary: ["chest"], reps: [12, 8] }), /Rep range/);
  const ex = makeCustomExercise({ name: "Hammer Strength incline", primary: ["chest"], secondary: ["triceps", "chest"], reps: ["8", "12"] }, 1);
  assert.deepEqual(ex.secondary, ["triceps"]);
  assert.deepEqual(ex.reps, [8, 12]);
  registerCustom([ex]);
  assert.equal(BY_ID[ex.id].name, "Hammer Strength incline");
  const cov = coverage({ days: [{ name: "A", items: [{ id: ex.id, sets: 4, reps: [8, 12] }] }] }, targets("intermediate"), 1);
  assert.equal(cov.weekly.chest, 4);
  assert.equal(cov.weekly.triceps, 2);
});

test("coverage scales by how often each routine day comes round", () => {
  const r = { days: [{ name: "A", items: [{ id: "bb-bench", sets: 4, reps: [5, 8] }] }, { name: "B", items: [{ id: "back-squat", sets: 4, reps: [5, 8] }] }] };
  assert.equal(coverage(r, targets("intermediate"), 4).weekly.chest, 8); // each day twice a week
  assert.equal(coverage(r, targets("intermediate"), 2).weekly.chest, 4);
  const heavy = { days: [{ name: "A", items: [{ id: "bb-bench", sets: 6, reps: [5, 8] }, { id: "db-fly", sets: 6, reps: [10, 15] }] }] };
  assert.equal(coverage(heavy, targets("intermediate"), 1).heavyDays[0].muscle, "chest");
});

test("generated plan → editable routine keeps every exercise, set and rep range", () => {
  const w = planWeek({ split: "ppl", days: 6, minutes: 60, experience: "intermediate", equipment: eq });
  const r = routineFromPlan(w);
  assert.equal(r.days.length, 6);
  assert.deepEqual(r.days[0].items.map((i) => i.id), w.sessions[0].items.map((i) => i.id));
});

test("swaps: applied to the plan, never duplicating an exercise within a day, ignored if unavailable", () => {
  const sessions = [{ name: "Push", items: [{ id: "db-lateral", sets: 3, reps: [12, 20] }, { id: "cable-lateral", sets: 3, reps: [12, 20] }, { id: "pushdown", sets: 3, reps: [10, 15] }] }];
  assert.deepEqual(applySwaps(sessions, { "db-lateral": "cable-lateral" }, eq)[0].items.map((i) => i.id), ["db-lateral", "cable-lateral", "pushdown"]);
  const out = applySwaps(sessions, { pushdown: "skullcrusher" }, eq)[0].items;
  assert.equal(out[2].id, "skullcrusher");
  assert.equal(out[2].swappedFrom, "pushdown");
  assert.equal(applySwaps(sessions, { pushdown: "leg-press" }, PROFILES.dumbbell.equipment)[0].items[2].id, "pushdown");
});

test("alternatives: same pattern first, then same main muscle; excluded ids never offered", () => {
  const alts = alternatives("db-lateral", eq, [], ["cable-lateral"]).map((e) => e.id);
  assert.ok(!alts.includes("cable-lateral") && !alts.includes("db-lateral"));
  assert.equal(BY_ID[alts[0]].pattern, "lateral-raise");
  assert.ok(searchExercises("curl", "", PROFILES.bodyweight.equipment).every((r, i, a) => i === 0 || r.ok <= a[i - 1].ok)); // available first
});

test("plates per side and warm-ups", () => {
  assert.deepEqual(platesPerSide(225, "lb").plates, [45, 45]);
  assert.deepEqual(platesPerSide(190, "lb").plates, [45, 25, 2.5]);
  assert.equal(platesPerSide(40, "lb"), null);
  assert.deepEqual(platesPerSide(100, "kg").plates, [25, 15]);
  assert.deepEqual(warmups(225, 5, 45).map((s) => s.w), [90, 135, 180]);
  assert.deepEqual(warmups(95, 5, 45).map((s) => s.w), [55, 75]);
});

test("day templates: each fills a day with direct work for its focus, for the given equipment; repeats differ", () => {
  const p = { equipment: PROFILES.home.equipment, experience: "intermediate", minutes: 60 };
  const push = planDay("push", p);
  assert.equal(push.template, "push");
  assert.ok(push.items.length >= 3);
  assert.ok(push.items.some((i) => BY_ID[i.id].primary.includes("triceps")), "push has direct triceps");
  assert.ok(push.items.every((i) => available(BY_ID[i.id], p.equipment)));
  assert.ok(planDay("pull", p).items.some((i) => BY_ID[i.id].primary.includes("biceps")), "pull has direct biceps");
  const a = planDay("full", p, 0).items.map((i) => i.id).join(), b = planDay("full", p, 1).items.map((i) => i.id).join();
  assert.notEqual(a, b, "Full body A and B differ");
  for (const q of QUICK_STARTS) for (const k of q.days) assert.ok(planDay(k, p).items.length, `${q.label}: ${k} filled`);
});

test("searchExercises: text match ignores case and surrounding spaces", () => {
  const results1 = searchExercises("curl", "", eq);
  const results2 = searchExercises("CURL", "", eq);
  const results3 = searchExercises("  curl  ", "", eq);
  assert.deepEqual(
    results1.map((r) => r.ex.id),
    results2.map((r) => r.ex.id),
    "uppercase matches lowercase"
  );
  assert.deepEqual(
    results1.map((r) => r.ex.id),
    results3.map((r) => r.ex.id),
    "extra spaces don't affect match"
  );
});

test("searchExercises: muscle filter matches primary or secondary muscles", () => {
  const results = searchExercises("", "triceps", eq);
  assert.ok(results.length > 0, "triceps filter returns results");
  assert.ok(
    results.every((r) => r.ex.primary.includes("triceps") || r.ex.secondary.includes("triceps")),
    "every result includes triceps as primary or secondary"
  );
  assert.ok(
    results.some((r) => r.ex.id === "bb-bench"),
    "bb-bench (triceps secondary) is included"
  );
});

test("searchExercises: available before unavailable; with a muscle, primary before secondary; then alphabetical", () => {
  const results = searchExercises("", "triceps", PROFILES.commercial.equipment);
  const firstUnavailable = results.findIndex((r) => !r.ok);
  const lastAvailable = results.map((r) => r.ok).lastIndexOf(true);
  assert.ok(firstUnavailable === -1 || lastAvailable < firstUnavailable, "available come before unavailable");
  const avail = results.filter((r) => r.ok);
  const primary = avail.filter((r) => r.ex.primary.includes("triceps"));
  const secondary = avail.filter((r) => !r.ex.primary.includes("triceps"));
  assert.ok(primary.length > 0 && secondary.length > 0, "both groups present");
  const idx = (id) => avail.findIndex((r) => r.ex.id === id);
  assert.ok(idx("band-pushdown") >= 0 && idx("bb-bench") >= 0);
  assert.ok(idx("band-pushdown") < idx("bb-bench"), "Band pushdown (primary) before Barbell bench press (secondary)");
  assert.ok(
    Math.max(...primary.map((r) => avail.indexOf(r))) < Math.min(...secondary.map((r) => avail.indexOf(r))),
    "every primary comes before every secondary"
  );
  for (const group of [primary, secondary]) {
    const names = group.map((r) => r.ex.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), "alphabetical within group");
  }
});

test("searchExercises: custom exercise returned when in customs, always marked ok true", () => {
  const custom = makeCustomExercise({ name: "Custom Pull", primary: ["lats"], secondary: ["biceps"] }, 1);
  registerCustom([custom]);
  const results = searchExercises("custom pull", "", PROFILES.bodyweight.equipment, [custom]);
  const found = results.find((r) => r.ex.id === custom.id);
  assert.ok(found, "custom exercise is in results");
  assert.equal(found.ok, true);
});

test("searchExercises: custom exercise ok=true even when its equipment is not in the profile", () => {
  const custom = makeCustomExercise({ name: "Cable Machine Custom", primary: ["chest"] }, 2);
  custom.equipment = ["cable"];
  registerCustom([custom]);
  const eqBw = PROFILES.bodyweight.equipment;
  assert.equal(available(custom, eqBw), false, "equipment really is unavailable");
  const found = searchExercises("cable machine custom", "", eqBw, [custom]).find((r) => r.ex.id === custom.id);
  assert.ok(found, "custom exercise found");
  assert.equal(found.ok, true);
});

test("searchExercises: no query and no muscle returns all library exercises", () => {
  const results = searchExercises("", "", eq);
  assert.equal(results.length, EXERCISES.length, "all library exercises returned");
});

test("searchExercises: muscle and text filters both apply", () => {
  const results = searchExercises("curl", "biceps", eq);
  assert.ok(results.length > 0, "finds biceps curls");
  assert.ok(
    results.every((r) => r.ex.name.toLowerCase().includes("curl") && (r.ex.primary.includes("biceps") || r.ex.secondary.includes("biceps"))),
    "results match both filters"
  );
  assert.ok(
    results.some((r) => r.ex.id === "db-curl"),
    "db-curl found"
  );
});

test("searchExercises: available status marked correctly by equipment", () => {
  const results = searchExercises("bench", "", PROFILES.home.equipment);
  assert.ok(
    results.some((r) => r.ex.id === "bb-bench" && r.ok === true),
    "bb-bench available with home equipment (barbell, bench, rack)"
  );
});
