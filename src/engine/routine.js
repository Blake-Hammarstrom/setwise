// Routines: the generated plan or the user's own, in one shape: { days: [{ name, items: [{ id, sets, reps:[lo,hi] }] }] }.
// Coverage, swaps and custom exercises work identically for both, so progression never cares where a session came from.
import { BY_ID, EXERCISES, MUSCLES, available, credit } from "./exercises.js";
import { SESSION_CAP } from "./generator.js";
import { stalled } from "./progression.js";

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
  const rest = secondary.filter((m) => !primary.includes(m));
  return { id: `c-${slug(n) || "exercise"}-${now.toString(36)}`, name: n, equipment: ["floor"], primary, secondary: rest,
    pattern: `custom-${primary[0]}`, load, lower: !!lower, tier: "accessory", reps: [lo, hi], kind: new Set([...primary, ...rest]).size > 1 ? "compound" : "isolation" };
}

export const routineFromPlan = (plan) => ({ days: plan.sessions.map((s) => ({ name: s.name, template: s.day, items: s.items.map(({ id, sets, reps }) => ({ id, sets, reps: [...reps] })) })) });

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

/** Suggested swap for a stalled lift: the first like-for-like alternative, or null if the lift isn't stalled or nothing fits. */
export function suggestSwap(id, history, equipment, customs = [], exclude = []) {
  if (!BY_ID[id] || !stalled(BY_ID[id], history)) return null;
  return alternatives(id, equipment, customs, exclude)[0]?.id ?? null;
}

/** Library search for the routine editor: text and/or muscle; equipment-available exercises first. */
export function searchExercises(q, muscle, equipment, customs = []) {
  const t = String(q || "").toLowerCase().trim();
  return [...customs.map((c) => BY_ID[c.id] || c), ...EXERCISES]
    .filter((e) => (!t || e.name.toLowerCase().includes(t)) && (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)))
    .map((e) => ({ ex: e, ok: e.custom || available(e, equipment) }))
    .sort((a, b) => Number(b.ok) - Number(a.ok) || (muscle ? Number(b.ex.primary.includes(muscle)) - Number(a.ex.primary.includes(muscle)) : 0) || a.ex.name.localeCompare(b.ex.name));
}

export const DEFAULT_BAR = { lb: 45, kg: 20 };
export const DEFAULT_PLATES = { lb: [45, 35, 25, 10, 5, 2.5], kg: [25, 20, 15, 10, 5, 2.5, 1.25] };

const usablePlates = (list) => (Array.isArray(list) ? [...new Set(list.filter((p) => typeof p === "number" && p > 0 && Number.isFinite(p)))].sort((a, b) => b - a) : []);

/** The bar and plates a lifter owns for these units; each field falls back to the standard kit when missing or invalid. */
export function kitFor(prefs, units = "lb") {
  const u = units === "kg" ? "kg" : "lb";
  const b = prefs?.bar?.[u], own = usablePlates(prefs?.plates?.[u]);
  return { bar: typeof b === "number" && b > 0 && Number.isFinite(b) ? b : DEFAULT_BAR[u], plates: own.length ? own : [...DEFAULT_PLATES[u]] };
}

/** Plates per side for a barbell load (greedy, largest first; only the plates given, else the standard set). */
export function platesPerSide(total, units = "lb", bar = DEFAULT_BAR[units === "kg" ? "kg" : "lb"], plates) {
  const own = usablePlates(plates);
  const set = own.length ? own : DEFAULT_PLATES[units === "kg" ? "kg" : "lb"];
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

/** Logged sets per muscle in `weeks` consecutive 7-day windows, oldest first. A log exactly 7 days old is in the newest window. */
export function weeklySets(logs, now = Date.now(), weeks = 4) {
  const WEEK = 7 * 86400000;
  const out = Array.from({ length: weeks }, (_, i) => ({ start: new Date(now - (weeks - i) * WEEK).toISOString(), sets: Object.fromEntries(MUSCLES.map((m) => [m, 0])) }));
  for (const l of logs || []) {
    const t = Date.parse(l.date);
    if (Number.isNaN(t)) continue;
    const k = Math.max(0, Math.ceil((now - t) / WEEK) - 1);
    if (k >= weeks) continue;
    const sets = out[weeks - 1 - k].sets;
    for (const it of l.items || []) if (BY_ID[it.id]) for (const [m, v] of Object.entries(credit(BY_ID[it.id]))) sets[m] += v * it.sets.length;
  }
  return out;
}
