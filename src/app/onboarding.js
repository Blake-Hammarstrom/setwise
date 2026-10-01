// Three taps: where → how many days → which routine. Everything else has a sensible default (Settings changes it).
import { EQUIPMENT, MUSCLE_NAMES, PROFILES } from "../engine/exercises.js";
import { DAYS, SPLITS, planWeek } from "../engine/generator.js";
import { routineFromPlan } from "../engine/routine.js";
import { defaultUnits, load, save } from "./state.js";
import { $, $$, esc, sheet, closeSheet, toast, why } from "./ui.js";

const PLACE_HINT = { commercial: "Machines, cables, barbells, everything", home: "Barbell, rack, bench, dumbbells, pull-up bar (editable)", dumbbell: "Dumbbells and a bench", bodyweight: "A pull-up bar and the floor" };
const PREF = ["ppl", "upperLower", "fullBody", "bro"];
const dayNames = (split, days) => {
  const keys = SPLITS[split].days[days], counts = {};
  keys.forEach((k) => (counts[DAYS[k].name] = (counts[DAYS[k].name] || 0) + 1));
  return Object.entries(counts).map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(" · ");
};

export function onboarding(app, done) {
  const prev = load().profile || {};
  const p = { place: prev.place || null, equipment: prev.equipment || null, days: prev.days || null, minutes: prev.minutes || 60,
    experience: prev.experience || "intermediate", units: prev.units || defaultUnits(), swaps: prev.swaps || {} };
  let step = 1;

  const finish = (split, routine = null, then = null) => {
    const s = load();
    s.profile = { ...p, split: routine ? "custom" : split };
    s.routine = routine;
    s.startedAt ||= new Date().toISOString(); s.logs ||= []; delete s.draft;
    save(s); done(then || (routine ? "routine" : "today")); // your own routine opens in the editor (or the importer)
  };

  const draw = () => {
    const dots = `<div class="steps" aria-label="Step ${step} of 3">${[1, 2, 3].map((i) => `<span class="${i <= step ? "on" : ""}"></span>`).join("")}</div>`;
    if (step === 1) {
      app.innerHTML = `${dots}<h1>Where do you train?</h1><p class="lede">Your workouts only use equipment you have.</p>
      <div class="big-choices">${Object.entries(PROFILES).map(([k, v]) => `<button class="big-choice ${p.place === k ? "on" : ""}" data-place="${k}"><b>${v.label}</b><span>${PLACE_HINT[k]}</span></button>`).join("")}</div>`;
      $$("[data-place]", app).forEach((b) => (b.onclick = () => { p.place = b.dataset.place; p.equipment = [...PROFILES[p.place].equipment]; step = 2; draw(); }));
    } else if (step === 2) {
      app.innerHTML = `${dots}<button class="back" data-back>‹ Back</button><h1>How many days a week?</h1><p class="lede">Pick what you can actually keep up.</p>
      <div class="day-pick">${[2, 3, 4, 5, 6].map((d) => `<button class="day-btn ${p.days === d ? "on" : ""}" data-days="${d}">${d}</button>`).join("")}</div>
      ${p.place === "home" ? `<button class="btn ghost small mt" id="equip">Edit home equipment (${p.equipment.length} items)</button>` : ""}`;
      $$("[data-days]", app).forEach((b) => (b.onclick = () => { p.days = Number(b.dataset.days); step = 3; draw(); }));
      const eq = $("#equip", app);
      if (eq) eq.onclick = () => {
        const body = sheet("Your home equipment", `<div class="checks">${Object.entries(EQUIPMENT).map(([k, v]) => `<label><input type="checkbox" data-eq="${k}" ${p.equipment.includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div><button class="btn primary mt" data-close>Done</button>`);
        $$("[data-eq]", body).forEach((c) => (c.onchange = () => { p.equipment = c.checked ? [...p.equipment, c.dataset.eq] : p.equipment.filter((e) => e !== c.dataset.eq); }));
        body.closest(".sheet-wrap").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) draw(); });
      };
    } else {
      const options = Object.keys(SPLITS).filter((k) => SPLITS[k].days[p.days])
        .map((k) => { const w = planWeek({ ...p, split: k }); return { k, w }; })
        .sort((a, b) => a.w.shortfalls.length - b.w.shortfalls.length || PREF.indexOf(a.k) - PREF.indexOf(b.k));
      app.innerHTML = `${dots}<button class="back" data-back>‹ Back</button><h1>Pick your routine</h1>
      <div class="chips" role="group" aria-label="Session length">${[45, 60, 75, 90].map((m) => `<button class="chip ${p.minutes === m ? "on" : ""}" data-min="${m}">${m} min</button>`).join("")}</div>
      ${options.length ? "" : `<p class="lede">No built-in routine runs ${p.days} days a week. Build your own below, or go back and pick another number.</p>`}
      ${options.length && options.every((o) => o.w.shortfalls.length) ? `<p class="small muted">Nothing covers every muscle at ${p.minutes} min${p.minutes < 90 ? ": try a longer session above" : ""}${p.days < 6 ? `, or ${p.days + 1} days a week` : ""}. Or pick one anyway: shortfalls are shown, not hidden.</p>` : ""}
      <div class="routines">${options.map(({ k, w }, i) => `
        <div class="routine-card ${i === 0 && !w.shortfalls.length ? "best" : ""}">
          <button class="routine-pick" data-split="${k}">
            <span class="rc-top"><b>${SPLITS[k].label}</b>${i === 0 && !w.shortfalls.length ? `<span class="badge good">Recommended</span>` : ""}</span>
            <span class="rc-days">${esc(dayNames(k, p.days))}</span>
            <span class="rc-cov ${w.shortfalls.length ? "warn" : "ok"}">${w.shortfalls.length ? `Short on ${w.shortfalls.slice(0, 3).map((x) => MUSCLE_NAMES[x.muscle].toLowerCase()).join(", ")}${w.shortfalls.length > 3 ? "…" : ""} (${why(w.shortfalls[0].reasons)})` : "✓ Covers every muscle"}</span>
          </button>
          <button class="btn small ghost" data-custom-from="${k}">Edit exercises</button>
        </div>`).join("")}
        <div class="routine-card"><button class="routine-pick" data-paste><span class="rc-top"><b>I already have a routine</b></span><span class="rc-days">Paste it, copy it from a photo, or say it out loud.</span></button></div>
        <div class="routine-card"><button class="routine-pick" data-own><span class="rc-top"><b>Build my own</b></span><span class="rc-days">Start from Push, Pull, Legs or any day type, then change any exercise.</span></button></div>
      </div>
      <p class="small faint mt">Defaults: ${esc(p.experience)} · ${p.units}. Change anytime in Settings.</p>`;
      $$("[data-min]", app).forEach((b) => (b.onclick = () => { p.minutes = Number(b.dataset.min); draw(); }));
      $$("[data-split]", app).forEach((b) => (b.onclick = () => { finish(b.dataset.split); toast("Your first session is ready."); }));
      $$("[data-custom-from]", app).forEach((b) => (b.onclick = () => finish(null, routineFromPlan(planWeek({ ...p, split: b.dataset.customFrom })))));
      $("[data-own]", app).onclick = () => finish(null, { days: [] }); // the builder opens on its starting points
      $("[data-paste]", app).onclick = () => finish(null, { days: [] }, "import");
    }
    const back = $("[data-back]", app);
    if (back) back.onclick = () => { step -= 1; draw(); };
    closeSheet();
  };
  draw();
}
