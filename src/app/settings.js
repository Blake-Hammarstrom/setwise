// Settings: everything onboarding defaulted, plus data safety (backup, restore, install).
import { BY_ID, EQUIPMENT, PROFILES } from "../engine/exercises.js";
import { SPLITS } from "../engine/generator.js";
import { sessionBest } from "../engine/progression.js";
import { exName, historyOf, load, save, update } from "./state.js";
import { $, $$, closeSheet, download, esc, r1, sheet, toast } from "./ui.js";

let installEvent = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; });
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;

export function settings(app, go) {
  const s = load(), p = s.profile, custom = !!s.routine;
  const daysOpts = custom ? [1, 2, 3, 4, 5, 6, 7] : Object.keys(SPLITS[p.split].days).map(Number);
  const lifts = [...new Set((s.logs || []).flatMap((l) => l.items.map((i) => i.id)))];
  const swaps = Object.entries(p.swaps || {});
  const usedCustom = new Set((s.routine?.days || []).flatMap((d) => d.items.map((i) => i.id)));
  app.innerHTML = `<h1>Settings</h1>
  <section class="card"><h2>Routine</h2>
    <p><b>${custom ? "Your own routine" : SPLITS[p.split].label}</b> <span class="muted">· ${PROFILES[p.place]?.label || "Custom equipment"}</span></p>
    <div class="row"><button class="btn" id="change">Change routine</button><a class="btn ghost" href="#/routine" id="edit">${custom ? "Edit routine" : "Customize this plan"}</a></div></section>
  <section class="card"><h2>Training</h2><div class="grid">
    <label>Days a week<select id="st-days">${daysOpts.map((d) => `<option ${p.days === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
    ${custom ? "" : `<label>Session length<select id="st-min">${[45, 60, 75, 90].map((m) => `<option value="${m}" ${p.minutes === m ? "selected" : ""}>${m} min</option>`).join("")}</select></label>`}
    <label>Experience<select id="st-exp">${["beginner", "intermediate", "advanced"].map((x) => `<option ${p.experience === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <label>Units<select id="st-units">${["lb", "kg"].map((x) => `<option ${p.units === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <label>Rest, compound lifts<select id="st-rc">${[60, 90, 120, 150, 180, 240].map((x) => `<option value="${x}" ${s.prefs.restCompound === x ? "selected" : ""}>${x / 60} min</option>`).join("")}</select></label>
    <label>Rest, isolation<select id="st-ri">${[45, 60, 75, 90, 120].map((x) => `<option value="${x}" ${s.prefs.restIsolation === x ? "selected" : ""}>${x < 60 ? `${x}s` : `${r1(x / 60)} min`}</option>`).join("")}</select></label>
  </div><p class="small faint mt">Changing units doesn't convert weights you've already logged.</p></section>
  ${custom ? "" : `<section class="card"><h2>Equipment</h2><p class="small muted">${p.equipment.length} items · the plan only uses these.</p><button class="btn" id="equip">Edit equipment</button></section>`}
  ${swaps.length ? `<section class="card"><h2>Your swaps</h2>${swaps.map(([from, to]) => `<div class="row between"><span>${esc(exName(from))} → <b>${esc(exName(to))}</b></span><button class="btn small ghost" data-unswap="${esc(from)}">Undo</button></div>`).join("")}</section>` : ""}
  ${(s.customExercises || []).length ? `<section class="card"><h2>Your exercises</h2>${s.customExercises.map((c) => `<div class="row between"><span>${esc(c.name)}</span>${usedCustom.has(c.id) ? `<span class="small faint">in your routine</span>` : `<button class="btn small ghost" data-rmc="${esc(c.id)}">Delete</button>`}</div>`).join("")}</section>` : ""}
  <section class="card"><h2>Keep your data safe</h2>
    <p class="small muted">Your log lives only in this browser. ${standalone() ? "Installed as an app: good, the browser keeps its data." : "Install it to your home screen: it then works offline and the browser is far less likely to clear your data."}${s.lastBackup ? ` Last backup: ${new Date(s.lastBackup).toLocaleDateString()}.` : " No backup yet."}</p>
    <div class="row">${!standalone() ? `<button class="btn" id="install">Install app</button>` : ""}<button class="btn" id="export">Save a backup</button><label class="btn ghost">Restore backup<input type="file" id="import" accept="application/json,.json" hidden></label></div>
    ${lifts.length ? `<div class="row mt"><select id="lift" aria-label="Lift to export">${lifts.map((id) => `<option value="${esc(id)}">${esc(exName(id))}</option>`).join("")}</select><button class="btn ghost" id="csv">Export lift CSV</button></div><p class="small faint">Date and estimated 1RM per session: an outcome series for a self-experiment (e.g. N-of-1 Lab) or a spreadsheet.</p>` : ""}
  </section>
  <section class="card"><h2>Start over</h2><button class="btn ghost danger" id="reset">Erase everything on this device</button></section>`;

  const set = (f) => { update((st) => { f(st); delete st.draft; }); settings(app, go); toast("Saved."); };
  $("#st-days", app).onchange = (e) => set((st) => (st.profile.days = Number(e.target.value)));
  const mn = $("#st-min", app); if (mn) mn.onchange = (e) => set((st) => (st.profile.minutes = Number(e.target.value)));
  $("#st-exp", app).onchange = (e) => set((st) => (st.profile.experience = e.target.value));
  $("#st-units", app).onchange = (e) => set((st) => (st.profile.units = e.target.value));
  $("#st-rc", app).onchange = (e) => set((st) => (st.prefs.restCompound = Number(e.target.value)));
  $("#st-ri", app).onchange = (e) => set((st) => (st.prefs.restIsolation = Number(e.target.value)));
  $("#change", app).onclick = () => { if (!custom || confirm("Pick a different routine? Your own routine will be replaced; your log is kept.")) go("setup"); };
  $("#edit", app).onclick = (e) => { if (!custom) { e.preventDefault(); go("plan"); } };
  const eq = $("#equip", app);
  if (eq) eq.onclick = () => {
    const body = sheet("Your equipment", `<div class="checks">${Object.entries(EQUIPMENT).map(([k, v]) => `<label><input type="checkbox" data-eq="${k}" ${p.equipment.includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div><button class="btn primary mt" id="eq-save">Save</button>`);
    $("#eq-save", body).onclick = () => { const list = $$("[data-eq]", body).filter((c) => c.checked).map((c) => c.dataset.eq); closeSheet(); set((st) => { st.profile.equipment = list; st.profile.place = "home"; }); };
  };
  $$("[data-unswap]", app).forEach((b) => (b.onclick = () => set((st) => delete st.profile.swaps[b.dataset.unswap])));
  $$("[data-rmc]", app).forEach((b) => (b.onclick = () => { if (confirm("Delete this exercise? Logged sets for it stay in your history.")) set((st) => (st.customExercises = st.customExercises.filter((c) => c.id !== b.dataset.rmc))); }));
  const inst = $("#install", app);
  if (inst) inst.onclick = async () => {
    if (installEvent) { installEvent.prompt(); await installEvent.userChoice; installEvent = null; return; }
    sheet("Install Setwise", `<p>On iPhone: tap <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</p><p>On Android: open the browser menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p><p class="small muted">Once installed it opens full screen, works offline at the gym, and keeps your data.</p>`);
  };
  $("#export", app).onclick = () => {
    download(`setwise-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "setwise", version: 2, exportedAt: new Date().toISOString(), ...load() }, null, 2), "application/json");
    update((st) => (st.lastBackup = new Date().toISOString())); settings(app, go);
  };
  $("#import", app).onchange = async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (d.app !== "setwise" || !d.profile || !Array.isArray(d.logs)) throw new Error("that isn't a Setwise backup");
      if (!confirm(`Replace everything on this device with the backup (${d.logs.length} sessions)?`)) return;
      save({ profile: d.profile, routine: d.routine || null, customExercises: d.customExercises || [], startedAt: d.startedAt, logs: d.logs, prefs: d.prefs, lastBackup: d.exportedAt });
      toast("Backup restored."); go("today");
    } catch (x) { toast(`Couldn't restore: ${x.message}`); }
  };
  const c = $("#csv", app);
  if (c) c.onclick = () => { const id = $("#lift", app).value, ex = BY_ID[id], h = historyOf(load(), id); download(`${id}.csv`, `date,${id}_e1rm\n${h.map((x) => `${x.date.slice(0, 10)},${r1(sessionBest(ex, x))}`).join("\n")}\n`, "text/csv"); };
  $("#reset", app).onclick = () => { if (confirm("Erase your routine and every logged session on this device? Save a backup first if you want a copy.")) { localStorage.removeItem("setwise.v1"); go("setup"); } };
}
