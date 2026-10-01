// Weekly plan generator (docs/VERIFICATION_PROTOCOL.md G1–G6). Deterministic: same profile + block → same plan.
//   targets → per-session deficits → greedy exercise choice (coverage score, compound/main first, block-seeded
//   tie-break) → sets within the time budget → weekly totals → explicit shortfalls with reasons.
import { BY_ID, EXERCISES, MUSCLES, PROFILES, available, credit } from "./exercises.js";

/** Weekly hard-set ranges, intermediate (Spec: research-informed convention, adjustable). */
export const BASE_TARGETS = { chest: [12, 18], lats: [10, 16], upperBack: [10, 16], frontDelts: [0, 12], sideDelts: [10, 18], rearDelts: [6, 12],
  biceps: [8, 14], triceps: [8, 14], quads: [12, 18], hamstrings: [10, 16], glutes: [8, 16], calves: [6, 12], abs: [6, 12] };
const SCALE = { beginner: 0.7, intermediate: 1, advanced: 1.2 };
export const SESSION_CAP = 10; // max fractional sets per muscle per session (G4)

export function targets(experience = "intermediate") {
  const k = SCALE[experience];
  return Object.fromEntries(Object.entries(BASE_TARGETS).map(([m, [lo, hi]]) => [m, [Math.round(lo * k), Math.round(hi * k)]]));
}

const UPPER = ["chest", "lats", "upperBack", "frontDelts", "sideDelts", "rearDelts", "biceps", "triceps"];
const LOWER = ["quads", "hamstrings", "glutes", "calves", "abs"];
// focus: the day's job. assist: muscles that may take leftover weekly volume here (how real body-part splits
// reach weekly targets under a per-session ceiling).
const DAYS = {
  full: { name: "Full body", focus: [...UPPER, ...LOWER], assist: [] },
  upper: { name: "Upper", focus: UPPER, assist: [] },
  lower: { name: "Lower", focus: LOWER, assist: [] },
  push: { name: "Push", focus: ["chest", "frontDelts", "sideDelts", "triceps"], assist: ["abs"] },
  pull: { name: "Pull", focus: ["lats", "upperBack", "rearDelts", "biceps"], assist: ["abs"] },
  legs: { name: "Legs", focus: ["quads", "hamstrings", "glutes", "calves", "abs"], assist: [] },
  chestDay: { name: "Chest", focus: ["chest"], assist: ["triceps", "frontDelts", "abs"] },
  backDay: { name: "Back", focus: ["lats", "upperBack"], assist: ["biceps", "rearDelts"] },
  shoulderDay: { name: "Shoulders", focus: ["sideDelts", "rearDelts", "frontDelts"], assist: ["chest", "upperBack", "abs"] },
  armDay: { name: "Arms", focus: ["biceps", "triceps"], assist: ["chest", "lats", "abs"] },
  legDay: { name: "Legs", focus: ["quads", "hamstrings", "glutes", "calves"], assist: ["abs"] },
};
export const SPLITS = {
  fullBody: { label: "Full body", days: { 2: ["full", "full"], 3: ["full", "full", "full"], 4: ["full", "full", "full", "full"] } },
  upperLower: { label: "Upper / lower", days: { 2: ["upper", "lower"], 4: ["upper", "lower", "upper", "lower"] } },
  ppl: { label: "Push / pull / legs", days: { 3: ["push", "pull", "legs"], 6: ["push", "pull", "legs", "push", "pull", "legs"] } },
  bro: { label: "Body-part split", days: { 5: ["chestDay", "backDay", "legDay", "shoulderDay", "armDay"] } },
};

// Minutes per working set including rest; fixed warm-up time per session and per main lift.
const SET_MIN = { main: 3, compound: 2.5, isolation: 2 }, WARMUP = 5, MAIN_WARMUP = 2;
const setMinutes = (ex) => (ex.tier === "main" ? SET_MIN.main : ex.kind === "compound" ? SET_MIN.compound : SET_MIN.isolation);

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 1e6) / 1e6; }

/**
 * Two passes, so the main lifts never depend on accessory rotation (G6):
 *   1. main lifts for the whole week (seeded by block pair), up to MAIN_PER_DAY each day;
 *   2. accessories, day by day, filling each muscle's share of what's left of its weekly aim. When the time budget
 *      can't fit every share, all shares shrink in proportion, so no muscle is starved to feed another.
 * @param {{equipment:string[], split:string, days:number, experience:string, minutes:number, block?:number, skip?:string[]}} p
 */
export function planWeek(p) {
  const T = targets(p.experience), block = p.block ?? 0, skip = new Set(p.skip || []);
  const dayKeys = SPLITS[p.split]?.days[p.days];
  if (!dayKeys) throw new Error(`${SPLITS[p.split]?.label || p.split} isn't offered with ${p.days} days a week`);
  const pool = EXERCISES.filter((e) => available(e, p.equipment) && !skip.has(e.id));
  // Weekly aim: 40% into the range (comfortably above the minimum, well under the maximum).
  const aim = Object.fromEntries(MUSCLES.map((m) => [m, T[m][0] + 0.4 * (T[m][1] - T[m][0])]));
  const zero = () => Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  const weekly = zero(), limits = Object.fromEntries(MUSCLES.map((m) => [m, new Set()])), used = new Set();
  const S = dayKeys.map((dk) => ({ day: dk, name: DAYS[dk].name, items: [], per: zero(), time: WARMUP }));
  const fits = (s, c, sets) => Object.entries(c).every(([m, v]) => s.per[m] + v * sets <= SESSION_CAP && weekly[m] + v * sets <= T[m][1] + 2);
  const add = (s, ex, sets, role) => {
    const c = credit(ex);
    s.items.push({ id: ex.id, sets, reps: ex.reps, role });
    s.time += sets * setMinutes(ex) + (ex.tier === "main" ? MAIN_WARMUP : 0);
    for (const [m, v] of Object.entries(c)) { s.per[m] += v * sets; weekly[m] += v * sets; }
    used.add(ex.id);
  };
  const tie = (ex, dk) => 0.1 * hash(`${ex.tier === "main" ? Math.floor(block / 2) : block}:${dk}:${ex.id}`);
  // Share of a muscle's weekly aim that belongs to day i (focus: an even split; assist: overflow only).
  const focusIdx = (m) => dayKeys.map((d, i) => (DAYS[d].focus.includes(m) ? i : -1)).filter((i) => i >= 0);
  const share = (m, i) => {
    const f = focusIdx(m), perFocus = Math.min(SESSION_CAP, aim[m] / Math.max(1, f.length));
    if (f.includes(i)) return perFocus;
    if (DAYS[dayKeys[i]].assist.includes(m)) {
      const assists = dayKeys.filter((d) => DAYS[d].assist.includes(m)).length;
      return Math.max(0, aim[m] - perFocus * f.length) / assists;
    }
    return 0;
  };

  // Pass 1: main lifts.
  const MAIN_PER_DAY = { full: 3, upper: 2, lower: 2, push: 1, pull: 1, legs: 2, chestDay: 1, backDay: 2, shoulderDay: 1, armDay: 0, legDay: 2 };
  S.forEach((s, i) => {
    for (let k = 0; k < MAIN_PER_DAY[s.day]; k++) {
      let best = null;
      for (const ex of pool) {
        if (ex.tier !== "main" || s.items.some((it) => it.id === ex.id || BY_ID[it.id].pattern === ex.pattern)) continue;
        if (ex.load === "bodyweight" && pool.some((o) => o.pattern === ex.pattern && o.load !== "bodyweight")) continue;
        const gain = ex.primary.reduce((g, m) => g + Math.max(0, share(m, i) - s.per[m]), 0);
        if (gain < 1 || !fits(s, credit(ex), 3)) continue;
        const score = gain + (used.has(ex.id) ? -0.5 : 0) + 3 * loaded(ex) + tie(ex, s.day);
        if (!best || score > best.score) best = { ex, score };
      }
      if (!best || s.time + 3 * setMinutes(best.ex) + MAIN_WARMUP > p.minutes * 0.5) break;
      add(s, best.ex, 3, "main");
    }
  });

  // Pass 2: accessories, with every share scaled to the time left.
  S.forEach((s, i) => {
    // Direct work first (amendment 1, G7): every muscle the day is FOR gets at least one exercise that trains it as a
    // primary mover, e.g. triceps on push day even when pressing already credits them. Most specific exercise wins.
    // Full-body days (13 focus muscles) spread direct work across the week instead (amendment 2): muscle k gets it in
    // the full-body session k mod n, so every muscle still gets direct work weekly without crowding out compounds.
    const fullIdx = S.slice(0, i + 1).filter((x) => x.day === "full").length - 1, nFull = S.filter((x) => x.day === "full").length;
    for (const [k, m] of DAYS[s.day].focus.entries()) {
      // Assigned here, or assigned to an earlier full-body session that couldn't fit it (carried over).
      const directEarlier = S.slice(0, i).some((x) => x.items.some((it) => BY_ID[it.id].primary.includes(m)));
      if (s.day === "full" && k % nFull !== fullIdx && !(k % nFull < fullIdx && !directEarlier)) continue;
      if (!T[m][0] || s.items.some((it) => BY_ID[it.id].primary.includes(m))) continue;
      let best = null;
      for (const ex of pool) {
        if (!ex.primary.includes(m) || s.items.some((it) => it.id === ex.id) || !fits(s, credit(ex), 2)) continue;
        const score = -ex.primary.length - 0.5 * ex.secondary.length + loaded(ex) + (used.has(ex.id) ? -0.05 : 0) + tie(ex, s.day);
        if (!best || score > best.score) best = { ex, score };
      }
      if (!best) continue;
      if (s.time + 2 * setMinutes(best.ex) > p.minutes) { limits[m].add("time"); continue; }
      let sets = Math.max(2, Math.min(3, Math.round(share(m, i) - s.per[m])));
      while (sets > 2 && (!fits(s, credit(best.ex), sets) || s.time + sets * setMinutes(best.ex) > p.minutes)) sets--;
      add(s, best.ex, sets, "accessory");
    }
    const need0 = Object.fromEntries(MUSCLES.map((m) => [m, Math.max(0, share(m, i) - s.per[m])]));
    const neededMin = MUSCLES.reduce((t, m) => t + need0[m], 0) * 2.1; // ~2.1 min per credited set (mixed exercises)
    const scale = Math.min(1, Math.max(0, p.minutes - s.time) / Math.max(1, neededMin));
    const target = Object.fromEntries(MUSCLES.map((m) => [m, s.per[m] + need0[m] * scale]));
    if (scale < 0.999) for (const m of MUSCLES) if (need0[m] >= 0.75) limits[m].add("time"); // shares shrunk to fit the session length
    for (let pass = 0; pass < 2; pass++) { // pass 0: scaled shares; pass 1: spend any time left on full shares
      for (let guard = 0; guard < 16; guard++) {
        const goal = pass ? (m) => s.per[m] + need0[m] - (s.per[m] - (target[m] - need0[m] * scale)) : (m) => target[m];
        const need = Object.fromEntries(MUSCLES.map((m) => [m, Math.max(0, (pass ? share(m, i) : goal(m)) - s.per[m])]));
        let best = null;
        for (const ex of pool) {
          if (ex.tier === "main" && s.items.some((it) => BY_ID[it.id].tier === "main" && BY_ID[it.id].pattern === ex.pattern)) continue;
          // At most two exercises per movement pattern in a session (never the same exercise twice).
          if (s.items.some((it) => it.id === ex.id) || s.items.filter((it) => BY_ID[it.id].pattern === ex.pattern).length >= 2) continue;
          const c = credit(ex);
          if (!Object.entries(c).some(([m, v]) => need[m] >= 0.75 && v >= 0.5 && (v === 1 || pass === 1 || ex.primary.every((q) => need[q] >= 0 || T[q][0] === 0)))) continue;
          if (!fits(s, c, 1)) continue;
          const gain = Object.entries(c).reduce((g, [m, v]) => g + Math.min(v, need[m]), 0) / setMinutes(ex); // coverage per minute
          const over = Object.entries(c).reduce((g, [m, v]) => g + Math.max(0, weekly[m] + v - aim[m] - 2) * 0.5, 0);
          const samePattern = s.items.some((it) => BY_ID[it.id].pattern === ex.pattern) ? 0.1 : 0;
          const score = gain - over - samePattern + (used.has(ex.id) ? -0.05 : 0) + loaded(ex) + tie(ex, s.day);
          if (!best || score > best.score) best = { ex, score, c };
        }
        if (!best) break;
        const { ex, c } = best;
        let sets = Math.max(2, Math.min(ex.kind === "isolation" ? 5 : 4, Math.round(Math.max(...Object.entries(c).map(([m, v]) => need[m] / v)))));
        while (sets > 1 && !fits(s, c, sets)) sets--;
        const fit = Math.floor((p.minutes - s.time) / setMinutes(ex));
        if (fit < 2) { for (const m of ex.primary) if (need[m] >= 0.75) limits[m].add("time"); break; }
        add(s, ex, Math.min(sets, fit), "accessory");
      }
    }
    for (const m of MUSCLES) if (share(m, i) > 0 && s.per[m] >= SESSION_CAP - 0.5) limits[m].add("per-session ceiling");
    s.items.sort((a, b) => (a.role === "main" ? 0 : 1) - (b.role === "main" ? 0 : 1) || rank(BY_ID[a.id]) - rank(BY_ID[b.id]));
  });

  const shortfalls = MUSCLES.filter((m) => weekly[m] < T[m][0]).map((m) => {
    const reasons = [...limits[m]];
    const trainers = pool.filter((e) => e.primary.includes(m)).length;
    if (!trainers) reasons.push("equipment");
    else if (trainers === 1 && !reasons.length) reasons.push("equipment variety (one exercise trains this with your kit)");
    const days = dayKeys.filter((d) => DAYS[d].focus.includes(m) || DAYS[d].assist.includes(m)).length;
    if (!days) reasons.push("split");
    else if (days * SESSION_CAP < T[m][0]) reasons.push("split frequency");
    if (!reasons.length) reasons.push("selection"); // the generator's own limitation, said plainly
    return { muscle: m, planned: weekly[m], min: T[m][0], reasons };
  });
  return { sessions: S.map(({ day, name, items, time }) => ({ day, name, items, minutes: Math.round(time) })), weekly, targets: T, shortfalls };
}
// Loadable exercises progress more precisely than bodyweight ones; prefer them when the equipment exists.
const loaded = (ex) => (ex.load === "bodyweight" ? 0 : 0.08);
const rank = (e) => (e.tier === "main" ? 0 : e.kind === "compound" ? 1 : 2);

export const profileEquipment = (profile, custom) => (profile === "home" && custom ? custom : PROFILES[profile].equipment);
export { DAYS };

/** Fit advisor: nearby setups (same equipment and experience) whose plan meets every minimum. */
export function suggestFits(p) {
  const out = [];
  for (const [split, s] of Object.entries(SPLITS))
    for (const days of Object.keys(s.days).map(Number))
      for (const minutes of [p.minutes, p.minutes + 15].filter((m) => m <= 120)) {
        if (split === p.split && days === p.days && minutes === p.minutes) continue;
        if (Math.abs(days - p.days) > 1) continue;
        if (!planWeek({ ...p, split, days, minutes }).shortfalls.length) out.push({ split, days, minutes, label: `${s.label}, ${days} days, ${minutes} min` });
      }
  return out.sort((a, b) => a.minutes - b.minutes || Math.abs(a.days - p.days) - Math.abs(b.days - p.days)).slice(0, 3);
}
