// G1–G6 (docs/VERIFICATION_PROTOCOL.md), checked exhaustively over every supported configuration.
// Usage: node scripts/verify.mjs [--write]   (--write → reports/verification.{json,md})
import { mkdirSync, writeFileSync } from "node:fs";
import { BY_ID, MUSCLES, MUSCLE_NAMES, PROFILES, available, credit } from "../src/engine/exercises.js";
import { SESSION_CAP, SPLITS, planWeek } from "../src/engine/generator.js";

const configs = [];
for (const profile of Object.keys(PROFILES))
  for (const [split, s] of Object.entries(SPLITS))
    for (const days of Object.keys(s.days).map(Number))
      for (const experience of ["beginner", "intermediate", "advanced"])
        for (const minutes of [45, 60, 75, 90]) configs.push({ profile, split, days, experience, minutes, equipment: PROFILES[profile].equipment });

const v = { G1: [], G2: [], G3: [], G4: [], G5: [], G6: [] };
// Time-feasibility LOWER bound: every set takes ≥ 2 min and credits at most the best useful amount any available
// exercise gives (muscles with a minimum > 0, primary 1 + secondary 0.5). If even that can't fit, no plan can.
import { targets as tg } from "../src/engine/generator.js";
// Structural: the split trains a muscle on too few days for its minimum under the per-session ceiling.
import { SESSION_CAP as CAP, DAYS } from "../src/engine/generator.js";
function structural(c, m) {
  const T = tg(c.experience), keys = SPLITS[c.split].days[c.days];
  return keys.filter((d) => DAYS[d].focus.includes(m) || DAYS[d].assist.includes(m)).length * CAP < T[m][0];
}
function infeasible(c) {
  const T = tg(c.experience), useful = (ex) => Object.entries(credit(ex)).reduce((s, [m, k]) => s + (T[m][0] > 0 ? k : 0), 0);
  const best = Math.max(...BY_ID && Object.values(BY_ID).filter((e) => available(e, c.equipment)).map(useful));
  const needSets = Object.values(T).reduce((s, [lo]) => s + lo, 0) / best;
  return needSets * 2 + c.days * 5 > c.days * c.minutes;
}
let provablyInfeasible = 0;
const g2Why = {}; // G2 misses by the plan's own stated reason
const why = (w) => { const r = w.shortfalls.flatMap((s) => s.reasons); return r.includes("split frequency") ? "structural: split trains a muscle once a week, minimum > per-session ceiling" : r.includes("time") ? "time budget" : r.includes("per-session ceiling") ? "per-session ceiling" : r[0]; };
let g2Eligible = 0, cov45 = 0, n45 = 0;
const bwShort = {};
for (const c of configs) {
  const w = planWeek({ ...c, block: 0 });
  const key = `${c.profile}/${c.split}/${c.days}d/${c.experience}/${c.minutes}min`;
  for (const s of w.sessions) {
    const per = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
    for (const it of s.items) {
      const ex = BY_ID[it.id];
      if (!available(ex, c.equipment)) v.G1.push(`${key}: ${ex.id}`);
      for (const [m, k] of Object.entries(credit(ex))) per[m] += k * it.sets;
    }
    for (const m of MUSCLES) if (per[m] > SESSION_CAP + 1e-9) v.G4.push(`${key} ${s.name}: ${m} ${per[m]}`);
  }
  const short = MUSCLES.filter((m) => w.weekly[m] < w.targets[m][0]);
  if (c.minutes >= 60 && c.profile !== "bodyweight") { g2Eligible++; if (short.length && infeasible(c)) provablyInfeasible++; if (short.length) g2Why[why(w)] = (g2Why[why(w)] || 0) + 1; if (short.length) v.G2.push(`${infeasible(c) ? "[infeasible] " : ""}${key}: ${short.map((m) => `${m} ${w.weekly[m]}/${w.targets[m][0]}`).join(", ")}`); }
  if (c.minutes === 45) { n45++; if (!short.length) cov45++; }
  if (c.profile === "bodyweight") for (const m of short) bwShort[m] = (bwShort[m] || 0) + 1;
  for (const m of short) if (!w.shortfalls.some((x) => x.muscle === m && x.reasons.length)) v.G3.push(`${key}: ${m} short with no explanation`);
  for (const m of MUSCLES) if (w.weekly[m] > w.targets[m][1] + 2 + 1e-9) v.G5.push(`${key}: ${m} ${w.weekly[m]} > ${w.targets[m][1]}+2`);
  // G6: determinism, and main lifts stable across blocks 0→1 (same main-lift seed)
  if (JSON.stringify(planWeek({ ...c, block: 0 })) !== JSON.stringify(w)) v.G6.push(`${key}: not deterministic`);
  const mains = (pl) => pl.sessions.map((s) => s.items.filter((i) => i.role === "main").map((i) => i.id).join(",")).join("|");
  if (mains(planWeek({ ...c, block: 1 })) !== mains(w)) v.G6.push(`${key}: main lifts changed between blocks 0 and 1`);
}
const result = { ranAt: new Date().toISOString(), configurations: configs.length, g2Eligible,
  criteria: Object.fromEntries(Object.entries(v).map(([k, list]) => [k, { violations: list.length, met: list.length === 0, examples: list.slice(0, 12) }])),
  reported: { g2MissesByReason: g2Why, g2ProvablyInfeasible: provablyInfeasible, coverageAt45: `${cov45}/${n45}`, bodyweightShortfalls: bwShort } };
for (const [k, c] of Object.entries(result.criteria)) console.log(k, c.met ? "MET" : `NOT MET (${c.violations})`, c.examples.slice(0, 6).join(" ; "));
console.log("reported:", JSON.stringify(result.reported));
if (process.argv.includes("--write")) {
  mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
  writeFileSync(new URL("../reports/verification.json", import.meta.url), JSON.stringify(result, null, 2));
  const names = { G1: "Equipment safety", G2: "Coverage (≥ 60 min, equipment profiles)", G3: "No silent shortfall", G4: `Per-session ceiling (≤ ${SESSION_CAP} sets)`, G5: "Weekly maximum + 2", G6: "Determinism; main lifts stable across blocks" };
  writeFileSync(new URL("../reports/verification.md", import.meta.url), `# Generator verification (${result.ranAt.slice(0, 10)})

Protocol: \`docs/VERIFICATION_PROTOCOL.md\`. Exhaustive: all ${configs.length} supported configurations (G2 applies to ${g2Eligible}).

| Id | Invariant | Violations | Verdict |
|---|---|---|---|
${Object.entries(result.criteria).map(([k, c]) => `| ${k} | ${names[k]} | ${c.violations} | **${c.met ? "met" : "not met"}** |`).join("\n")}

**G2 misses by the plan's own stated reason:** ${Object.entries(g2Why).map(([k, n]) => `${k}: ${n}`).join(" · ") || "none"}.

**Reported:**
- **Configurations at 45 min meeting every minimum:** ${result.reported.coverageAt45}.
- **Bodyweight shortfalls** (each is listed in that plan with its reason): ${Object.entries(bwShort).map(([m, n]) => `${MUSCLE_NAMES[m]} ${n}`).join(", ") || "none"}.
`);
}
