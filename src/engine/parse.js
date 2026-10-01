// Routine text → routine. For pasted notes, Live Text copied from a photo, or dictation.
// Deterministic: normalize (number words, abbreviations) → split into days → per line, extract sets × reps and match
// the exercise against the library by token overlap. Low-confidence matches are flagged for the user to confirm;
// nothing is silently guessed.
import { EXERCISES } from "./exercises.js";

const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, "twenty five": 25, thirty: 30 };
const DAY_WORDS = ["push", "pull", "legs", "leg", "upper", "lower", "full body", "fullbody", "chest", "back", "shoulders", "arms", "core",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Common gym shorthand → library words. Order matters: longer phrases first.
const ALIASES = [
  [/\bsldl\b|\bstiff[- ]leg(ged)? deadlifts?\b/g, "romanian deadlift"], [/\brdls?\b/g, "romanian deadlift"], [/\bohp\b|\bmilitary press\b/g, "overhead press"],
  [/\bdbs?\b/g, "dumbbell"], [/\bbbs?\b/g, "barbell"], [/\bkbs?\b/g, "kettlebell"], [/\bbw\b/g, "bodyweight"],
  [/\bcgbp?\b|\bclose grip bench\b/g, "close-grip bench press"], [/\bskull ?crushers?\b|\blying tricep(s)? extensions?\b/g, "skull crusher"],
  [/\btri(cep|ceps)? ?push ?downs?\b|\brope push ?downs?\b|\bpush ?downs?\b/g, "cable pushdown"], [/\blat pull ?downs?\b|\bpull ?downs?\b/g, "lat pulldown"],
  [/\bpull ?ups?\b/g, "pull-up"], [/\bchin ?ups?\b/g, "chin-up"], [/\bpush ?ups?\b/g, "push-up"], [/\bdips?\b/g, "dip"],
  [/\bside (lateral )?raises?\b|\blat(eral)? raises?\b|\blaterals?\b/g, "lateral raise"], [/\brear delt (flys?|flies)\b|\breverse flys?\b/g, "rear-delt fly"],
  [/\bfaces? pulls?\b/g, "face pull"], [/\bhammer curls?\b/g, "dumbbell curl"], [/\bbi(cep|ceps)? curls?\b|\bdumbbell bicep curls?\b/g, "dumbbell curl"], [/\bpreacher curls?\b/g, "cable curl"], [/\bez bar curls?\b/g, "barbell curl"],
  [/\bleg ext(ension)?s?\b/g, "leg extension"], [/\bham(string)? curls?\b|\blying leg curls?\b|\bseated leg curls?\b/g, "leg curl"],
  [/\bsquats?\b/g, "squat"], [/\bbulgarians?( split squats?)?\b|\bbss\b|\bsplit squats?\b/g, "bulgarian split squat"], [/\bhip thrusts?\b/g, "hip thrust"],
  [/\bcalf raises?\b|\bcalves\b/g, "calf raise"], [/\bflys?\b|\bflies\b/g, "fly"], [/\bcable crossovers?\b/g, "cable fly"],
  [/\bt[- ]?bar rows?\b/g, "barbell row"], [/\bseated rows?\b|\bcable rows?\b/g, "seated cable row"], [/\bincline bench\b/g, "incline press"],
  [/\bbench\b(?! press)/g, "bench press"], [/\bshoulder press\b/g, "shoulder press"], [/\babs\b|\bab crunch(es)?\b/g, "crunch"],
];
const STOP = new Set(["the", "and", "of", "with", "on", "for", "to", "in", "then", "do", "sets", "set", "reps", "rep", "x", "by", "times", "each", "side", "per", "machine", "s", "a"]);
const sing = (w) => (w.length > 3 && w.endsWith("es") && /(sh|ch|x|ss)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
const tokens = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(sing);

function normalize(s) {
  let t = s.toLowerCase().replace(/[–—]/g, "-").replace(/×/g, "x");
  for (const [w, n] of Object.entries(NUM).sort((a, b) => b[0].length - a[0].length)) t = t.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
  return t.replace(/\b(\d+) to (\d+)\b/g, "$1-$2").replace(/\s+/g, " ").trim();
}

/** Sets and reps from a line: "3x8", "3 x 8-10", "4 sets of 6-8", "3 by 10", "8-12 reps", "3 sets". */
export function setsReps(line) {
  const t = normalize(line);
  let m;
  if ((m = t.match(/(\d+)\s*(?:x|by|sets? of|sets? x|sets? @)\s*(\d+)(?:\s*-\s*(\d+))?/))) return { sets: +m[1], reps: m[3] ? [+m[2], +m[3]] : [+m[2], +m[2]], rest: t.replace(m[0], " ") };
  if ((m = t.match(/(\d+)\s*sets?\b/))) { const r = t.match(/(\d+)(?:\s*-\s*(\d+))?\s*reps?\b/); return { sets: +m[1], reps: r ? [+r[1], +(r[2] || r[1])] : null, rest: t.replace(m[0], " ").replace(r?.[0] || "\u0000", " ") }; }
  if ((m = t.match(/(\d+)(?:\s*-\s*(\d+))?\s*reps?\b/))) return { sets: null, reps: [+m[1], +(m[2] || m[1])], rest: t.replace(m[0], " ") };
  return { sets: null, reps: null, rest: t };
}

const LIB = EXERCISES.map((e) => ({ e, tok: new Set(tokens(e.name)) }));

/** Best library match for an exercise phrase, with a 0–1 confidence. Prefers available equipment when tied. */
export function matchExercise(phrase, equipment = null) {
  let p = ` ${phrase.toLowerCase()} `;
  for (const [re, to] of ALIASES) p = p.replace(re, ` ${to} `);
  const q = tokens(p);
  if (!q.length) return null;
  let best = null;
  for (const { e, tok } of LIB) {
    const hit = q.filter((w) => tok.has(w)).length;
    if (!hit) continue;
    // Recall of the user's words matters most; precision breaks ties toward the plainer exercise.
    const score = 0.7 * (hit / q.length) + 0.3 * (hit / tok.size) + (equipment && !e.equipment.every((x) => x === "floor" || equipment.includes(x)) ? -0.15 : 0) + (e.tier === "main" ? 0.02 : 0) + (e.load === "bodyweight" ? 0 : 0.03);
    if (!best || score > best.score) best = { ex: e, score };
  }
  return best && { id: best.ex.id, confidence: Math.max(0, Math.min(1, best.score)) };
}

// A heading is a day name on its own: "Push", "Push day", "Push A", "Upper 1", "Day 2", "Day 2 - legs", "Monday".
// "Back squat" or "Chest press" are exercises, not headings.
const isHeading = (line) => {
  const t = line.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/^day \d+( [a-z ]{0,20})?$/.test(t) || /^(week|session) \d+$/.test(t)) return true;
  return DAY_WORDS.some((w) => t === w || t === `${w} day` || new RegExp(`^${w} (day )?([a-d]|\\d)$`).test(t));
};
const title = (s) => s.replace(/[:\-–—]+\s*$/, "").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * @returns {{days: {name:string, items: {line:string, id:string|null, confidence:number, sets:number, reps:[number,number]|null}[]}[]}}
 */
export function parseRoutine(text, equipment = null) {
  const days = [];
  let cur = null;
  const ensure = (name) => { cur = { name, items: [] }; days.push(cur); };
  // Dictation arrives as one run-on line: "push day bench three by eight then incline press …". Break it on "then/next"
  // and around "<day word> day". Pasted lists break on newlines, semicolons, bullets and commas before a word.
  const prepared = String(text || "").replace(/\r/g, "")
    .replace(/\b(and then|after that|then|next)\b/gi, "\n")
    .replace(/\b((?:push|pull|legs?|upper|lower|chest|back|shoulders?|arms?|full body) day)\b/gi, "\n$1\n");
  const lines = prepared.split(/\n|;|•|·|,\s*(?=[a-z])/i).map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim()).filter(Boolean);
  for (const raw of lines) {
    // "Push: bench 3x8" → heading + item on one line.
    const colon = raw.match(/^([^:]{2,30}):\s*(.*)$/);
    if (colon && isHeading(colon[1])) { ensure(title(colon[1])); if (!colon[2]) continue; addItem(colon[2]); continue; }
    if (isHeading(raw)) { ensure(title(raw)); continue; }
    addItem(raw);
  }
  function addItem(line) {
    if (!cur) ensure("Day 1");
    const { sets, reps, rest } = setsReps(line);
    const m = matchExercise(rest, equipment);
    // A line without sets or reps must be a confident exercise match; otherwise it's a note ("warm up 10 min bike").
    if (sets == null && reps == null && (m?.confidence ?? 0) < CONFIDENT) return;
    cur.items.push({ line, id: m?.id || null, confidence: m?.confidence || 0, sets: sets || 3, reps });
  }
  return { days: days.filter((d) => d.items.length) };
}

export const CONFIDENT = 0.6;
