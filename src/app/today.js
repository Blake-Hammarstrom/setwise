// Today: the session you're doing. Built to be used mid-workout: one tap per set, numbers prefilled, rest timer,
// screen kept awake, and the draft saved after every change (closing the app loses nothing).
import { BY_ID } from "../engine/exercises.js";
import { increment, prescribe, sessionBest } from "../engine/progression.js";
import { platesPerSide, warmups } from "../engine/routine.js";
import { openPicker } from "./picker.js";
import { block, exName, historyOf, load, needsBackup, nextIndex, persist, save, sessionsOf, update } from "./state.js";
import { $, $$, closeSheet, download, esc, fmtTime, sheet, toast } from "./ui.js";

let wake = null;
const rest = { end: 0, total: 0, timer: 0 };

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}
export const leaveToday = () => { keepAwake(false); };
addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && location.hash.startsWith("#/today")) keepAwake(true); });

/** Reps to prefill for set j: the next sensible target given what happened last time. */
function prefillReps(rx, last, j) {
  if (rx.change === "first") return "";
  if (rx.change === "up" || rx.change === "down") return rx.reps[0];
  if (rx.change === "variation") return rx.reps[1];
  const prev = last?.sets[j]?.reps ?? last?.sets.at(-1)?.reps;
  return prev ? Math.min(rx.reps[1], prev + 1) : rx.reps[0];
}

function buildDraft(s, dayIndex) {
  const days = sessionsOf(s), d = days[dayIndex];
  return { dayIndex, day: d.day, name: d.name, startedAt: null, items: d.items.map((it) => draftItem(s, it.id, it.sets, it.reps, it.swappedFrom)) };
}
function draftItem(s, id, n, reps, swappedFrom) {
  const ex = BY_ID[id], h = historyOf(s, id), rx = prescribe({ ...ex, reps: reps || ex.reps }, h, s.profile.units), last = h.at(-1);
  return { id, swappedFrom, reps: rx.reps, sets: Array.from({ length: n }, (_, j) => ({ w: rx.load ?? (ex.load === "bodyweight" ? 0 : ""), reps: prefillReps(rx, last, j), done: false })) };
}

export function today(app, go) {
  let s = load();
  const days = sessionsOf(s);
  if (!days.length || !days.some((d) => d.items.length)) { app.innerHTML = `<h1>No exercises yet</h1><p class="lede">Your routine is empty.</p><a class="btn primary" href="#/routine">Add exercises</a>`; return; }
  let idx = Math.min(nextIndex(s, days.length), days.length - 1);
  while (!days[idx].items.length) idx = (idx + 1) % days.length; // skip empty days in your routine
  if (!s.draft || s.draft.dayIndex >= days.length || !s.draft.items.length) { s.draft = buildDraft(s, idx); save(s); }
  const d = s.draft, units = s.profile.units;
  const doneSets = d.items.reduce((n, it) => n + it.sets.filter((x) => x.done).length, 0), totalSets = d.items.reduce((n, it) => n + it.sets.length, 0);
  const ago = (iso) => { const days = Math.round((Date.now() - Date.parse(iso)) / 86400000); return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`; };

  app.innerHTML = `
  ${needsBackup(s) ? `<section class="card notice"><b>Back up your training log</b><p class="small muted">It lives only in this browser, and some browsers clear site data after a while. One tap saves a copy.</p><div class="row"><button class="btn small primary" id="bk">Save a backup</button><button class="btn small ghost" id="bk-later">Later</button></div></section>` : ""}
  <div class="today-head"><div><h1>${esc(d.name)}</h1><p class="lede">${d.dayIndex === idx ? "Next in your rotation" : "Picked for today"} · ${doneSets}/${totalSets} sets${d.startedAt ? ` · started ${Math.round((Date.now() - Date.parse(d.startedAt)) / 60000)} min ago` : ""}</p></div>
    <button class="btn small ghost" id="otherday">Other day</button></div>
  ${d.items.map((it, k) => {
    const ex = BY_ID[it.id] || { name: it.id, load: "machine", reps: it.reps, primary: [], secondary: [] };
    const h = historyOf(s, it.id), last = h.at(-1), rx = prescribe({ ...ex, reps: it.reps }, h, units);
    const work = Number(it.sets[0]?.w) || rx.load || 0;
    const plates = ex.load === "barbell" && work ? platesPerSide(work, units) : null;
    const wu = (ex.tier === "main" && ["barbell", "dumbbell"].includes(ex.load) && work) ? warmups(work, increment(ex, units), ex.load === "barbell" ? (units === "kg" ? 20 : 45) : 0) : [];
    const allDone = it.sets.length && it.sets.every((x) => x.done);
    return `<section class="card ex-card ${allDone ? "complete" : ""}" data-k="${k}">
      <div class="ex-head"><b>${esc(ex.name)}</b><span class="tag ${rx.change}">${{ first: "new", up: "add weight", hold: "beat reps", down: "back off", variation: "level up" }[rx.change]}</span></div>
      <p class="rx">${it.sets.length} × ${it.reps[0]}–${it.reps[1]}${rx.load ? ` @ <b>${rx.load} ${units}</b>` : ""} · ${esc(rx.note)}</p>
      ${last ? `<p class="last">Last (${ago(last.date)}): ${last.sets.map((x) => (x.w ? `${x.w}×${x.reps}` : `${x.reps}`)).join(", ")}</p>` : ""}
      ${plates && plates.plates.length ? `<p class="last">Per side: ${plates.plates.join(" + ")}${plates.remainder ? ` (+${plates.remainder} short)` : ""}</p>` : ""}
      ${wu.length ? `<details class="wu"><summary>Warm-up</summary><p class="last">${wu.map((x) => `${x.w}×${x.reps}`).join(" · ")}, then your working sets.</p></details>` : ""}
      <div class="sets">${it.sets.map((x, j) => `<div class="set ${x.done ? "done" : ""}"><span class="n">${j + 1}</span>
        <input inputmode="decimal" aria-label="${esc(ex.name)} set ${j + 1} weight (${units})" placeholder="${ex.load === "bodyweight" ? "+0" : units}" value="${x.w === "" ? "" : x.w}" data-w="${k}:${j}">
        <input inputmode="numeric" aria-label="${esc(ex.name)} set ${j + 1} reps" placeholder="${it.reps[0]}–${it.reps[1]}" value="${x.reps}" data-r="${k}:${j}">
        <button class="tick ${x.done ? "done" : ""}" data-t="${k}:${j}" aria-label="Set ${j + 1} ${x.done ? "done; tap to undo" : "done"}">✓</button></div>`).join("")}</div>
      <div class="row ex-actions"><button class="btn small ghost" data-addset="${k}">＋ Set</button><button class="btn small ghost" data-rmset="${k}" ${it.sets.length <= 1 ? "disabled" : ""}>− Set</button><button class="btn small ghost" data-swap="${k}">Swap</button>${it.adhoc ? `<button class="btn small ghost" data-rmex="${k}">Remove</button>` : ""}</div>
    </section>`;
  }).join("")}
  <button class="btn ghost wide" id="addex">＋ Add an exercise to today</button>
  <div id="rest" class="rest" hidden></div>
  <div class="sticky"><button class="btn primary" id="finish">Finish session${doneSets ? ` · ${doneSets} sets` : ""}</button></div>`;

  keepAwake(true);
  const patch = (key, f) => { const [k, j] = key.split(":").map(Number); return update((st) => { st.draft.startedAt ||= new Date().toISOString(); f(st.draft.items[k], j); }); };
  $$("[data-w]", app).forEach((i) => (i.onchange = () => patch(i.dataset.w, (it, j) => { it.sets[j].w = i.value === "" ? "" : Number(i.value); if (j === 0) it.sets.forEach((x, q) => { if (q > 0 && !x.done) x.w = it.sets[0].w; }); })));
  $$("[data-r]", app).forEach((i) => (i.onchange = () => patch(i.dataset.r, (it, j) => { it.sets[j].reps = i.value === "" ? "" : Number(i.value); })));
  $$("[data-t]", app).forEach((b) => (b.onclick = () => {
    const row = b.closest(".set"), rv = $("[data-r]", row).value, wv = $("[data-w]", row).value;
    if (rv === "") { $("[data-r]", row).focus(); return toast("How many reps?"); }
    let nowDone = false, ex;
    patch(b.dataset.t, (it, j) => { it.sets[j].w = wv === "" ? 0 : Number(wv); it.sets[j].reps = Number(rv); it.sets[j].done = !it.sets[j].done; nowDone = it.sets[j].done; ex = BY_ID[it.id]; });
    if (nowDone) startRest(ex?.kind === "compound" ? s.prefs.restCompound : s.prefs.restIsolation);
    today(app, go);
  }));
  $$("[data-addset]", app).forEach((b) => (b.onclick = () => { patch(`${b.dataset.addset}:0`, (it) => { const l = it.sets.at(-1); it.sets.push({ w: l?.w ?? "", reps: l?.reps ?? "", done: false }); }); today(app, go); }));
  $$("[data-rmset]", app).forEach((b) => (b.onclick = () => { patch(`${b.dataset.rmset}:0`, (it) => { if (it.sets.length > 1) it.sets.pop(); }); today(app, go); }));
  $$("[data-rmex]", app).forEach((b) => (b.onclick = () => { update((st) => st.draft.items.splice(+b.dataset.rmex, 1)); today(app, go); }));
  $$("[data-swap]", app).forEach((b) => (b.onclick = () => swap(app, go, +b.dataset.swap)));
  $("#addex", app).onclick = () => openPicker({ title: "Add to today", exclude: d.items.map((x) => x.id), onPick: (id) => { update((st) => st.draft.items.push({ ...draftItem(st, id, 3), adhoc: true })); today(app, go); toast(`${exName(id)} added for today.`); } });
  $("#otherday", app).onclick = () => {
    const body = sheet("Do a different day", `<div class="pick-list">${days.map((x, i) => `<button class="pick-row" data-day="${i}"><b>${esc(x.name)}</b><span>${x.items.map((it) => exName(it.id)).slice(0, 4).join(", ")}${x.items.length > 4 ? "…" : ""}${i === idx ? " · next in rotation" : ""}</span></button>`).join("")}</div>`);
    $$("[data-day]", body).forEach((x) => (x.onclick = () => {
      const st = load();
      if (st.draft.items.some((it) => it.sets.some((q) => q.done)) && !confirm("You've logged sets in this session. Switch and discard them?")) return;
      st.draft = buildDraft(st, +x.dataset.day); save(st); closeSheet(); today(app, go);
    }));
  };
  const bk = $("#bk", app);
  if (bk) { bk.onclick = () => { download(`setwise-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "setwise", version: 2, exportedAt: new Date().toISOString(), ...load() }, null, 2), "application/json"); update((st) => (st.lastBackup = new Date().toISOString())); today(app, go); };
    $("#bk-later", app).onclick = () => { update((st) => (st.lastBackup = new Date(Date.now() - 7 * 86400000).toISOString())); today(app, go); }; }
  $("#finish", app).onclick = () => finish(app, go);
  drawRest();
}

function swap(app, go, k) {
  const st = load(), it = st.draft.items[k];
  openPicker({ title: `Swap ${exName(it.id)}`, swapFor: it.id, exclude: st.draft.items.map((x) => x.id), onPick: (id) => {
    const body = sheet(`Use ${exName(id)}…`, `<div class="pick-list"><button class="pick-row" data-when="today"><b>Just today</b><span>Your routine stays the same.</span></button><button class="pick-row" data-when="always"><b>From now on</b><span>Replaces ${esc(exName(it.id))} in your ${st.routine ? "routine" : "plan"}.</span></button></div>`);
    $$("[data-when]", body).forEach((b) => (b.onclick = () => {
      update((s2) => {
        const cur = s2.draft.items[k], n = cur.sets.length;
        s2.draft.items[k] = { ...draftItem(s2, id, n), adhoc: cur.adhoc };
        if (b.dataset.when === "always") {
          if (s2.routine) { const day = s2.routine.days[s2.draft.dayIndex]; const pos = day?.items.findIndex((x) => x.id === cur.id); if (pos >= 0) day.items[pos] = { id, sets: day.items[pos].sets, reps: [...BY_ID[id].reps] }; }
          else s2.profile.swaps[cur.swappedFrom || cur.id] = id;
        }
      });
      closeSheet(); today(app, go); toast(b.dataset.when === "always" ? `${exName(id)} is in your ${load().routine ? "routine" : "plan"} from now on.` : `${exName(id)} just for today.`);
    }));
  } });
}

function finish(app, go) {
  const st = load(), d = st.draft;
  const items = d.items.map((it) => ({ id: it.id, sets: it.sets.filter((x) => x.done).map(({ w, reps }) => ({ w: Number(w) || 0, reps: Number(reps) })) })).filter((it) => it.sets.length);
  if (!items.length) return toast("Tick at least one set first.");
  const open = d.items.reduce((n, it) => n + it.sets.filter((x) => !x.done).length, 0);
  if (open && !confirm(`${open} set${open === 1 ? "" : "s"} not ticked. Finish anyway?`)) return;
  // New bests (estimated 1RM, or reps for unloaded bodyweight work), before this session is added.
  const prs = items.filter((it) => { const ex = BY_ID[it.id]; if (!ex) return false; const h = historyOf(st, it.id); const now = sessionBest(ex, it); return h.length && now > Math.max(...h.map((x) => sessionBest(ex, x))); }).map((it) => exName(it.id));
  st.logs.push({ date: new Date().toISOString(), dayIndex: d.dayIndex, day: d.name, block: block(st), items });
  delete st.draft; save(st); persist(); stopRest();
  const sets = items.reduce((n, i) => n + i.sets.length, 0), mins = d.startedAt ? Math.round((Date.now() - Date.parse(d.startedAt)) / 60000) : null;
  const body = sheet("Session logged", `<p class="big-num">${sets} sets</p><p class="muted">${esc(d.name)}${mins ? ` · ${mins} min` : ""}</p>
    ${prs.length ? `<p class="pr">New best: ${prs.map(esc).join(", ")}</p>` : `<p class="small muted">No new bests today. Consistency is what moves the trend.</p>`}
    <div class="row mt"><button class="btn primary" data-close id="nx">See next session</button><a class="btn ghost" href="#/progress" data-close>Progress</a></div>`);
  $("#nx", body).onclick = () => { closeSheet(); today(app, go); };
  today(app, go);
}

// Rest timer: survives re-renders (module state), vibrates when done.
function startRest(sec) {
  rest.total = sec; rest.end = Date.now() + sec * 1000;
  clearInterval(rest.timer); rest.timer = setInterval(drawRest, 500); drawRest();
}
function stopRest() { clearInterval(rest.timer); rest.end = 0; drawRest(); }
function drawRest() {
  const el = document.getElementById("rest");
  if (!el) return;
  if (!rest.end) { el.hidden = true; return; }
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  el.hidden = false;
  if (left <= 0) {
    if (!rest.buzzed) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ } rest.buzzed = true; }
    el.innerHTML = `<b>Rest's up</b><span>Next set when ready</span><button class="btn small ghost" id="rest-x">Dismiss</button>`;
    if (left < -20) stopRest();
  } else {
    rest.buzzed = false;
    el.innerHTML = `<b>${fmtTime(left)}</b><span>Rest</span><button class="btn small ghost" id="rest-plus">+30s</button><button class="btn small ghost" id="rest-x">Skip</button>`;
    const pl = document.getElementById("rest-plus"); if (pl) pl.onclick = () => { rest.end += 30000; drawRest(); };
  }
  const x = document.getElementById("rest-x"); if (x) x.onclick = stopRest;
}
