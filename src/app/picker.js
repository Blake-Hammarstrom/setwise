// Exercise picker sheet: search + muscle filter + "create your own". Used by the routine editor, swaps and ad-hoc adds.
import { EQUIPMENT, MUSCLES, MUSCLE_NAMES } from "../engine/exercises.js";
import { alternatives, makeCustomExercise, registerCustom, searchExercises } from "../engine/routine.js";
import { load, save } from "./state.js";
import { $, $$, closeSheet, esc, sheet, toast } from "./ui.js";

const needs = (ex) => ex.equipment.filter((e) => e !== "floor").map((e) => EQUIPMENT[e] || e).join(", ");
const row = (ex, ok) => `<button class="pick-row ${ok ? "" : "dim"}" data-pick="${esc(ex.id)}"><b>${esc(ex.name)}</b><span>${ex.primary.map((m) => MUSCLE_NAMES[m]).join(", ")}${ex.secondary.length ? ` · also ${ex.secondary.map((m) => MUSCLE_NAMES[m].toLowerCase()).join(", ")}` : ""}${ok ? "" : ` · needs ${esc(needs(ex))}`}${ex.custom ? " · yours" : ""}</span></button>`;

/**
 * @param {{title:string, swapFor?:string, muscle?:string, query?:string, exclude?:string[], onPick:(id:string)=>void}} o
 *   swapFor: show like-for-like alternatives to this exercise first. exclude: ids already in the session/day.
 */
export function openPicker(o) {
  const s = load(), eq = s.profile.equipment, customs = s.customExercises || [];
  let q = o.query || "", muscle = o.muscle || "";
  const body = sheet(o.title, `
    <input type="search" id="pk-q" placeholder="Search exercises" autocomplete="off" aria-label="Search exercises" value="${esc(q)}">
    <div class="chips scroll mt-s" role="group" aria-label="Filter by muscle"><button class="chip ${!muscle ? "on" : ""}" data-m="">All</button>${MUSCLES.map((m) => `<button class="chip ${muscle === m ? "on" : ""}" data-m="${m}">${MUSCLE_NAMES[m]}</button>`).join("")}</div>
    <div id="pk-list" class="pick-list"></div>
    <button class="btn ghost small mt" id="pk-new">＋ Create my own exercise</button>`);
  const list = () => {
    const exclude = o.exclude || [];
    const alts = o.swapFor && !q && !muscle ? alternatives(o.swapFor, eq, customs, exclude) : null;
    const items = alts ? alts.map((ex) => ({ ex, ok: true })) : searchExercises(q, muscle, eq, customs).filter(({ ex }) => !exclude.includes(ex.id)).slice(0, 60);
    $("#pk-list", body).innerHTML = (alts ? `<p class="small faint">Like-for-like alternatives with your equipment:</p>` : "") +
      (items.map(({ ex, ok }) => row(ex, ok)).join("") || `<p class="muted small">Nothing matches. Create your own below.</p>`);
    $$("[data-pick]", body).forEach((b) => (b.onclick = () => { closeSheet(); o.onPick(b.dataset.pick); }));
  };
  $("#pk-q", body).oninput = (e) => { q = e.target.value; list(); };
  $$("[data-m]", body).forEach((b) => (b.onclick = () => { muscle = b.dataset.m; $$("[data-m]", body).forEach((x) => x.classList.toggle("on", x === b)); list(); }));
  $("#pk-new", body).onclick = () => createExercise(o.onPick, q);
  list();
}

function createExercise(onPick, name = "") {
  const body = sheet("Create an exercise", `
    <label>Name<input id="cx-name" value="${esc(name)}" placeholder="e.g. Hammer Strength row" autocomplete="off"></label>
    <p class="small muted mt">Mainly trains <span class="faint">(counts as a full set)</span></p>
    <div class="chips wrap" data-group="primary">${MUSCLES.map((m) => `<button class="chip" data-m="${m}">${MUSCLE_NAMES[m]}</button>`).join("")}</div>
    <p class="small muted mt">Also trains <span class="faint">(optional; counts as half a set)</span></p>
    <div class="chips wrap" data-group="secondary">${MUSCLES.map((m) => `<button class="chip" data-m="${m}">${MUSCLE_NAMES[m]}</button>`).join("")}</div>
    <div class="grid mt">
      <label>Loaded with<select id="cx-load"><option value="machine">Machine / cable stack</option><option value="barbell">Barbell</option><option value="dumbbell">Dumbbells</option><option value="bodyweight">Bodyweight</option></select></label>
      <label>Body half<select id="cx-lower"><option value="">Upper body</option><option value="1">Lower body</option></select></label>
      <label>Reps from<input id="cx-lo" inputmode="numeric" value="8"></label>
      <label>Reps to<input id="cx-hi" inputmode="numeric" value="12"></label>
    </div>
    <p class="error small" id="cx-err"></p>
    <button class="btn primary mt" id="cx-save">Create and add</button>`);
  $$("[data-group] [data-m]", body).forEach((b) => (b.onclick = () => b.classList.toggle("on")));
  $("#cx-save", body).onclick = () => {
    const pick = (g) => $$(`[data-group="${g}"] .chip.on`, body).map((b) => b.dataset.m);
    try {
      const ex = makeCustomExercise({ name: $("#cx-name", body).value, primary: pick("primary"), secondary: pick("secondary"), load: $("#cx-load", body).value,
        lower: !!$("#cx-lower", body).value, reps: [$("#cx-lo", body).value, $("#cx-hi", body).value] });
      const s = load(); s.customExercises = [...(s.customExercises || []), ex]; save(s); registerCustom([ex]);
      closeSheet(); toast(`${ex.name} created.`); onPick(ex.id);
    } catch (e) { $("#cx-err", body).textContent = e.message; }
  };
}
