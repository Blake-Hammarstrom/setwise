// State: one object in localStorage. Everything the app knows about you lives here and only here.
//   profile  { place, equipment, split ("custom" for your own), days, minutes, experience, units, swaps }
//   routine  null (generated plan) | { days: [{ name, items: [{ id, sets, reps }] }] }  (your own)
//   customExercises, logs [{ date, dayIndex, day, block, items: [{ id, sets: [{ w, reps }] }] }], draft, prefs, lastBackup
import { BY_ID } from "../engine/exercises.js";
import { planWeek } from "../engine/generator.js";
import { applySwaps, registerCustom } from "../engine/routine.js";

const KEY = "setwise.v1", BLOCK_DAYS = 28;
export const DEFAULT_PREFS = { restCompound: 150, restIsolation: 90 };

export function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { s = {}; }
  registerCustom(s.customExercises);
  s.prefs = { ...DEFAULT_PREFS, ...s.prefs };
  if (s.profile) s.profile.swaps ||= {};
  // v1 drafts had no per-item rep range or dayIndex: rebuild instead of crashing (logged sessions are unaffected).
  if (s.draft && (!Number.isInteger(s.draft.dayIndex) || s.draft.items?.some((it) => !Array.isArray(it.reps)))) delete s.draft;
  return s;
}
export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export const update = (f) => { const s = load(); f(s); save(s); return s; };

export const defaultUnits = () => (/^en-(US|LR|MM)/.test(navigator.language || "") ? "lb" : "kg");
export const block = (s) => Math.max(0, Math.floor((Date.now() - Date.parse(s.startedAt || Date.now())) / (BLOCK_DAYS * 86400000)));

/** The days you cycle through: your own routine, or the generated plan with your permanent swaps applied. */
export function sessionsOf(s) {
  if (s.routine) return s.routine.days.map((d, i) => ({ day: `custom-${i}`, name: d.name, items: d.items }));
  const w = planWeek({ ...s.profile, block: block(s) });
  return applySwaps(w.sessions, s.profile.swaps, s.profile.equipment);
}

/** Next day in the rotation: after the last day you actually did (so skipping or reordering days just works). */
export function nextIndex(s, n) {
  const logs = s.logs || [];
  if (!logs.length) return 0;
  const last = logs[logs.length - 1];
  return Number.isInteger(last.dayIndex) ? (last.dayIndex + 1) % n : logs.length % n;
}

export const historyOf = (s, id) => (s.logs || []).map((l) => ({ date: l.date, sets: l.items.find((i) => i.id === id)?.sets || [] })).filter((h) => h.sets.length);
export const exName = (id) => BY_ID[id]?.name || "Removed exercise";

/** Ask the browser not to evict this site's storage (granted automatically for installed apps on most browsers). */
export async function persist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
export const needsBackup = (s) => (s.logs || []).length >= 5 && (!s.lastBackup || Date.now() - Date.parse(s.lastBackup) > 14 * 86400000);
