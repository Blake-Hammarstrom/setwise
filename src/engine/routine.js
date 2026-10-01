// Routines: the generated plan or the user's own, in one shape: { days: [{ name, items: [{ id, sets, reps:[lo,hi] }] }] }.
// Coverage, swaps and custom exercises work identically for both, so progression never cares where a session came from.
import { BY_ID, EXERCISES, MUSCLES, available, credit } from "./exercises.js";
import { SESSION_CAP } from "./generator.js";

/** Add the user's own exercises to the lookup (they're stored with the user's data, not in the library). */
export function registerCustom(list = []) {
  for (const ex of list) BY_ID[ex.id] = { ...ex, custom: true };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
/** Validate and build a custom exercise. Throws with a plain reason. */
export function makeCustomExercise({ name, primary = [], secondary = [], load = "machine", lower = false, reps = [8, 12] }, now = Date.now()) {
  const n = String(name || "").trim();
  if (!n) throw new Error("Give it a name.");
  if (!primary.length) throw new Error("Pick at least one muscle it mainly trains.");
  if (!primary.every((m) => MUSCLES.includes(m)) || !secondary.every((m) => MUSCLES.includes(m))) throw new Error("Unknown muscle.");
  const [lo, hi] = reps.map(Number);
  if (!(lo >= 1 && hi > lo && hi <= 50)) throw new Error("Rep range must be like 8–12.");
  return { id: `c-${slug(n) || "exercise"}-${now.toString(36)}`, name: n, equipment: ["floor"], primary, secondary: secondary.filter((m) => !primary.includes(m)),
    pattern: `custom-${primary[0]}`, load, lower: !!lower, tier: "accessory", reps: [lo, hi], kind: primary.length + secondary.length > 1 ? "compound" : "isolation" };
}

export const routineFromPlan = (plan) => ({ days: plan.sessions.map((s) => ({ name: s.name, items: s.items.map(({ id, sets, reps }) => ({ id, sets, reps: [...reps] })) })) });

/** Apply the user's permanent swaps to a generated plan's sessions (a swap is ignored if its exercise isn't available). */
export function applySwaps(sessions, swaps = {}, equipment = []) {
  return sessions.map((s) => ({ ...s, items: s.items.map((it) => {
    const to = swaps[it.id], ex = to && BY_ID[to];
    // Never duplicate an exercise within a day: if the replacement is already there, keep the original.
    const dup = s.items.some((o) => o.id === to);
    return ex && !dup && (ex.custom || available(ex, equipment)) ? { ...it, id: to, reps: [...ex.reps], swappedFrom: it.id } : it;
  }) }));
}

/**
 * Weekly coverage of a routine. `perWeek` = training days per week; a routine with N days cycles, so each day is done
 * perWeek / N times a week on average.
 */
export function coverage(routine, T, perWeek = routine.days.length) {
  const k = perWeek / Math.max(1, routine.days.length);
  const weekly = Object.fromEntries(MUSCLES.map((m) => [m, 0])), heavyDays = [];
  routine.days.forEach((d) => {
    const per = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
    for (const it of d.items) { const ex = BY_ID[it.id]; if (!ex) continue; for (const [m, v] of Object.entries(credit(ex))) per[m] += v * it.sets; }
    for (const m of MUSCLES) { weekly[m] += per[m] * k; if (per[m] > SESSION_CAP) heavyDays.push({ day: d.name, muscle: m, sets: per[m] }); }
  });
  for (const m of MUSCLES) weekly[m] = Math.round(weekly[m] * 10) / 10;
  return { weekly, short: MUSCLES.filter((m) => weekly[m] < T[m][0]), over: MUSCLES.filter((m) => weekly[m] > T[m][1] + 2), heavyDays };
}

/** Like-for-like alternatives: same movement pattern first, then anything training the same main muscle. */
export function alternatives(id, equipment, customs = [], exclude = []) {
  const ex = BY_ID[id];
  if (!ex) return [];
  const pool = [...EXERCISES.filter((e) => available(e, equipment)), ...customs.map((c) => BY_ID[c.id] || c)].filter((e) => e.id !== id && !exclude.includes(e.id));
  const same = pool.filter((e) => e.pattern === ex.pattern);
  const muscle = pool.filter((e) => e.pattern !== ex.pattern && e.primary.includes(ex.primary[0]));
  return [...same, ...muscle];
}

/** Library search for the routine editor: text and/or muscle; equipment-available exercises first. */
export function searchExercises(q, muscle, equipment, customs = []) {
  const t = String(q || "").toLowerCase().trim();
  return [...customs.map((c) => BY_ID[c.id] || c), ...EXERCISES]
    .filter((e) => (!t || e.name.toLowerCase().includes(t)) && (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)))
    .map((e) => ({ ex: e, ok: e.custom || available(e, equipment) }))
    .sort((a, b) => Number(b.ok) - Number(a.ok) || (muscle ? Number(b.ex.primary.includes(muscle)) - Number(a.ex.primary.includes(muscle)) : 0) || a.ex.name.localeCompare(b.ex.name));
}

/** Plates per side for a barbell load (greedy; standard plate sets). */
export function platesPerSide(total, units = "lb", bar = units === "kg" ? 20 : 45) {
  const set = units === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  let side = (total - bar) / 2;
  if (side < 0) return null;
  const out = [];
  for (const p of set) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return { plates: out, remainder: Math.round(side * 100) / 100 };
}

/** Warm-up ramp for a main lift: 40%×8, 60%×5, 80%×3, rounded to the increment, dropping sets below the empty bar. */
export function warmups(work, inc, minLoad = 0) {
  if (!work) return [];
  return [[0.4, 8], [0.6, 5], [0.8, 3]].map(([f, r]) => ({ w: Math.round((work * f) / inc) * inc, reps: r })).filter((s) => s.w >= minLoad && s.w < work);
}
