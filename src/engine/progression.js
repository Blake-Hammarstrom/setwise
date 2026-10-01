// Progression rules R1–R5 (docs/VERIFICATION_PROTOCOL.md). Deterministic double progression, conservative.

/** Load increment by equipment type, lower vs upper body, and units. */
export function increment(ex, units = "lb") {
  const kg = units === "kg";
  if (ex.load === "barbell") return ex.lower ? (kg ? 5 : 10) : (kg ? 2.5 : 5);
  if (ex.load === "dumbbell") return kg ? 2 : 5;
  if (ex.load === "cable" || ex.load === "machine") return kg ? 2.5 : 5;
  return kg ? 2.5 : 5; // added load on a bodyweight exercise (vest, belt, backpack)
}

/** Epley estimated one-rep max. */
export const e1rm = (w, reps) => w * (1 + reps / 30);
const roundTo = (x, step) => Math.max(0, Math.round(x / step) * step);

/**
 * @param ex exercise from the library
 * @param history [{date, sets:[{w, reps}]}] oldest first; only sessions where this exercise was logged
 * @returns {{load:number|null, reps:[number,number], change:"first"|"up"|"hold"|"down"|"variation", note:string}}
 */
export function prescribe(ex, history, units = "lb") {
  const [lo, hi] = ex.reps;
  const done = history.filter((h) => h.sets?.length);
  if (!done.length) {
    return { load: null, reps: [lo, hi], change: "first",
      note: ex.load === "bodyweight" ? `Do ${lo}–${hi} reps per set, stopping about 2 short of failure.` : `Pick a weight you could lift for ${hi} reps with about 2 left in the tank.` };
  }
  const last = done[done.length - 1], w = Math.max(...last.sets.map((s) => s.w || 0));
  const allTop = last.sets.every((s) => s.reps >= hi);
  const allLow = (h) => h.sets.every((s) => s.reps < lo);
  if (ex.load === "bodyweight" && !w) {
    if (allTop) return { load: 0, reps: [lo, hi], change: "variation", note: `You hit ${hi} on every set: move to a harder variation or add weight.` };
    return { load: 0, reps: [lo, hi], change: "hold", note: "Beat last time's reps." };
  }
  const inc = increment(ex, units);
  if (allTop) return { load: w + inc, reps: [lo, hi], change: "up", note: `Every set reached ${hi}: +${inc} ${units}.` };
  if (done.length >= 2 && allLow(last) && allLow(done[done.length - 2]))
    return { load: roundTo(w * 0.9, inc), reps: [lo, hi], change: "down", note: `Two sessions below ${lo} reps: back off 10% and build up again.` };
  return { load: w, reps: [lo, hi], change: "hold", note: `Same weight; add reps until every set reaches ${hi}.` };
}

/** Best estimated 1RM per session (bodyweight-only work uses reps, since there's no load to estimate from). */
export const sessionBest = (ex, h) => Math.max(...h.sets.map((s) => (ex.load === "bodyweight" && !s.w ? s.reps : e1rm(s.w, s.reps))));

/** R4: no new best in the last 4 exposures → stalled. */
export function stalled(ex, history, window = 4) {
  const done = history.filter((h) => h.sets?.length);
  if (done.length < window + 1) return false;
  const bests = done.map((h) => sessionBest(ex, h));
  const before = Math.max(...bests.slice(0, -window));
  return Math.max(...bests.slice(-window)) <= before;
}
