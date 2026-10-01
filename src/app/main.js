// Setwise app. Your setup and training log live in localStorage; nothing leaves this browser.
import { BY_ID, EQUIPMENT, MUSCLES, MUSCLE_NAMES, PROFILES, credit } from "../engine/exercises.js";
import { SPLITS, planWeek, suggestFits } from "../engine/generator.js";
import { prescribe, sessionBest, stalled } from "../engine/progression.js";

const KEY = "setwise.v1", BLOCK_DAYS = 28;
const $ = (s) => document.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const r1 = (x) => Math.round(x * 10) / 10;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { toast("This browser blocked storage: your log won't be kept."); } }
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 2800); }

const block = (s) => Math.floor((Date.now() - Date.parse(s.startedAt)) / (BLOCK_DAYS * 86400000));
const plan = (s) => planWeek({ ...s.profile, block: block(s) });
const historyOf = (s, id) => (s.logs || []).map((l) => ({ date: l.date, sets: l.items.find((i) => i.id === id)?.sets || [] })).filter((h) => h.sets.length);
const unit = (s) => s.profile.units;

function nav(route) {
  const s = load();
  $("#nav").innerHTML = s.profile ? [["today", "Today"], ["progress", "Progress"], ["week", "Week"], ["settings", "Settings"]]
    .map(([r, l]) => `<a href="#/${r}" class="${route === r ? "on" : ""}">${l}</a>`).join("") : "";
}

// ---------- Setup ----------
function setup() {
  const s = load();
  const p = { place: "commercial", equipment: PROFILES.commercial.equipment, split: "ppl", days: 6, minutes: 60, experience: "intermediate", units: "lb", skip: [], ...s.profile };
  const draw = () => {
    const daysOpts = Object.keys(SPLITS[p.split].days).map(Number);
    if (!daysOpts.includes(p.days)) p.days = daysOpts[daysOpts.length - 1];
    const w = planWeek(p), fits = w.shortfalls.length ? suggestFits(p) : [];
    app.innerHTML = `
    <h1>${s.profile ? "Your setup" : "Train every muscle, every week."}</h1>
    <p class="lede">${s.profile ? "Changes apply from your next session. Your log is kept." : "Tell it where you train and how. It builds each day's session, sets your next weights from your last one, and checks every muscle gets its weekly work."}</p>
    <section class="card"><h2>Where you train</h2><div class="choices">
      ${Object.entries(PROFILES).map(([k, v]) => `<button class="choice ${p.place === k ? "on" : ""}" data-place="${k}"><b>${v.label}</b><span>${k === "home" ? "pick your equipment" : k === "commercial" ? "everything" : k === "dumbbell" ? "dumbbells and a bench" : "a pull-up bar and the floor"}</span></button>`).join("")}
    </div>
    ${p.place === "home" ? `<div class="checks mt">${Object.entries(EQUIPMENT).map(([k, v]) => `<label><input type="checkbox" data-eq="${k}" ${p.equipment.includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div>` : ""}
    </section>
    <section class="card"><h2>How you train</h2><div class="grid">
      <label>Split<select data-k="split">${Object.entries(SPLITS).map(([k, v]) => `<option value="${k}" ${p.split === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>
      <label>Days a week<select data-k="days">${daysOpts.map((d) => `<option ${p.days === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
      <label>Session length<select data-k="minutes">${[45, 60, 75, 90].map((m) => `<option value="${m}" ${p.minutes === m ? "selected" : ""}>${m} min</option>`).join("")}</select></label>
      <label>Experience<select data-k="experience">${["beginner", "intermediate", "advanced"].map((x) => `<option ${p.experience === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label>Units<select data-k="units">${["lb", "kg"].map((x) => `<option ${p.units === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    </div></section>
    <section class="card"><h2>Weekly sets per muscle with this setup</h2>${volumeBars(w.weekly, w.targets)}
      ${w.shortfalls.length ? `<p class="small warn">Short: ${w.shortfalls.map((x) => `${MUSCLE_NAMES[x.muscle]} ${r1(x.planned)}/${x.min} (${why(x.reasons)})`).join(" · ")}</p>
        ${fits.length ? `<p class="small">Setups that cover everything: ${fits.map((f) => `<button class="btn small" data-fit='${JSON.stringify(f)}'>${esc(f.label)}</button>`).join(" ")}</p>` : `<p class="small muted">No nearby setup covers every minimum with this equipment.</p>`}`
        : `<p class="small muted">Every muscle reaches its weekly minimum.</p>`}
      <p class="small faint">Targets are weekly hard sets (a secondary muscle counts half). They're research-informed ranges, not exact science: about 10 or more sets a week tends to beat fewer.</p>
    </section>
    <div class="sticky"><button class="btn primary" id="go">${s.profile ? "Save setup" : "Start training"}</button></div>`;
    app.querySelectorAll("[data-place]").forEach((b) => (b.onclick = () => { p.place = b.dataset.place; p.equipment = [...PROFILES[p.place].equipment]; draw(); }));
    app.querySelectorAll("[data-eq]").forEach((c) => (c.onchange = () => { p.equipment = c.checked ? [...p.equipment, c.dataset.eq] : p.equipment.filter((e) => e !== c.dataset.eq); draw(); }));
    app.querySelectorAll("[data-k]").forEach((c) => (c.onchange = () => { const k = c.dataset.k; p[k] = ["days", "minutes"].includes(k) ? Number(c.value) : c.value; draw(); }));
    app.querySelectorAll("[data-fit]").forEach((b) => (b.onclick = () => { Object.assign(p, JSON.parse(b.dataset.fit)); draw(); }));
    $("#go").onclick = () => {
      const st = load();
      st.profile = { place: p.place, equipment: p.equipment, split: p.split, days: p.days, minutes: p.minutes, experience: p.experience, units: p.units, skip: p.skip || [] };
      st.startedAt ||= new Date().toISOString(); st.logs ||= []; delete st.draft;
      save(st); location.hash = "#/today"; toast("Saved. Here's your next session.");
    };
  };
  draw();
}

// The main reason in plain words (most fundamental first).
const WHY = [["split frequency", "trained once a week"], ["equipment", "no exercise for it with your kit"], ["equipment variety (one exercise trains this with your kit)", "only one exercise for it with your kit"],
  ["per-session ceiling", "10-set limit per session"], ["time", "session length"], ["split", "not in this split"], ["selection", "the planner couldn't fit it"]];
const why = (reasons) => (WHY.find(([k]) => reasons.includes(k)) || [, reasons[0]])[1];

function volumeBars(done, T) {
  const max = Math.max(...MUSCLES.map((m) => Math.max(T[m][1] + 2, done[m])));
  return `<div class="bars">${MUSCLES.filter((m) => T[m][1] > 0).map((m) => {
    const short = done[m] < T[m][0];
    return `<div class="bar"><span>${MUSCLE_NAMES[m]}</span><div class="track"><div class="range" data-l="${(100 * T[m][0]) / max}" data-w="${(100 * (T[m][1] - T[m][0])) / max}"></div><div class="fill ${short ? "short" : ""}" data-w="${(100 * Math.min(done[m], max)) / max}"></div></div><span class="num">${r1(done[m])} / ${T[m][0]}–${T[m][1]}</span></div>`;
  }).join("")}</div>`;
}

// ---------- Today ----------
function today() {
  const s = load(), w = plan(s), idx = (s.logs || []).length, ses = w.sessions[idx % w.sessions.length];
  if (!s.draft || s.draft.index !== idx || s.draft.day !== ses.day) {
    s.draft = { index: idx, day: ses.day, items: ses.items.map((it) => {
      const rx = prescribe(BY_ID[it.id], historyOf(s, it.id), unit(s));
      return { id: it.id, sets: Array.from({ length: it.sets }, () => ({ w: rx.load ?? "", reps: "", done: false })) };
    }) };
    save(s);
  }
  const d = s.draft;
  app.innerHTML = `
  <h1>${esc(ses.name)}</h1>
  <p class="lede">Session ${idx + 1} · about ${ses.minutes} min · block ${block(s) + 1} (exercises refresh every 4 weeks)</p>
  <section class="card">${d.items.map((it, k) => {
    const ex = BY_ID[it.id], h = historyOf(s, it.id), rx = prescribe(ex, h, unit(s)), st = stalled(ex, h);
    return `<div class="ex" data-k="${k}">
      <div class="ex-head"><b>${esc(ex.name)}</b><span class="tag ${rx.change}">${{ first: "new", up: "add weight", hold: "beat reps", down: "back off", variation: "level up" }[rx.change]}</span></div>
      <p class="rx">${it.sets.length} × ${rx.reps[0]}–${rx.reps[1]} reps${rx.load ? ` @ ${rx.load} ${unit(s)}` : ""} · ${esc(rx.note)}${st ? ` <span class="warn">No new best in 4 sessions: consider a swap.</span>` : ""}</p>
      <div class="sets">${it.sets.map((x, j) => `<div class="set"><span class="n">${j + 1}</span>
        <input inputmode="decimal" aria-label="${esc(ex.name)} set ${j + 1} weight" placeholder="${ex.load === "bodyweight" ? "+0" : unit(s)}" value="${x.w}" data-w="${k}:${j}">
        <input inputmode="numeric" aria-label="${esc(ex.name)} set ${j + 1} reps" placeholder="${rx.reps[0]}–${rx.reps[1]}" value="${x.reps}" data-r="${k}:${j}">
        <button class="tick ${x.done ? "done" : ""}" data-t="${k}:${j}" aria-label="Set ${j + 1} done">✓</button></div>`).join("")}</div>
      <div class="row mt-s"><button class="btn small ghost" data-swap="${k}">Swap exercise</button></div>
    </div>`;
  }).join("")}</section>
  <div class="sticky"><button class="btn primary" id="finish">Finish session</button></div>`;

  const upd = (key, f) => { const [k, j] = key.split(":").map(Number); const st = load(); f(st.draft.items[k].sets[j]); save(st); return st.draft.items[k].sets[j]; };
  app.querySelectorAll("[data-w]").forEach((i) => (i.onchange = () => upd(i.dataset.w, (x) => { x.w = i.value === "" ? "" : Number(i.value); })));
  app.querySelectorAll("[data-r]").forEach((i) => (i.onchange = () => upd(i.dataset.r, (x) => { x.reps = i.value === "" ? "" : Number(i.value); })));
  app.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => {
    const row = b.closest(".set"), wv = row.querySelector("[data-w]").value, rv = row.querySelector("[data-r]").value;
    if (rv === "") { row.querySelector("[data-r]").focus(); return toast("Enter the reps you did first."); }
    const x = upd(b.dataset.t, (x) => { x.w = wv === "" ? 0 : Number(wv); x.reps = Number(rv); x.done = !x.done; });
    b.classList.toggle("done", x.done);
  }));
  app.querySelectorAll("[data-swap]").forEach((b) => (b.onclick = () => {
    const st = load(), id = st.draft.items[Number(b.dataset.swap)].id;
    st.profile.skip = [...new Set([...(st.profile.skip || []), id])];
    delete st.draft; save(st); today(); toast(`${BY_ID[id].name} swapped out. You can bring it back in Settings.`);
  }));
  $("#finish").onclick = () => {
    const st = load(), items = st.draft.items.map((it) => ({ id: it.id, sets: it.sets.filter((x) => x.done).map(({ w, reps }) => ({ w: Number(w) || 0, reps })) })).filter((it) => it.sets.length);
    if (!items.length) return toast("Tick at least one set before finishing.");
    st.logs.push({ date: new Date().toISOString(), day: st.draft.day, block: block(st), items });
    delete st.draft; save(st);
    toast(`Logged ${items.reduce((n, i) => n + i.sets.length, 0)} sets. Next session is ready.`);
    location.hash = "#/progress";
  };
}

// ---------- Progress ----------
function progress() {
  const s = load(), logs = s.logs || [], w = plan(s), since = Date.now() - 7 * 86400000;
  const doneWeek = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const l of logs.filter((l) => Date.parse(l.date) >= since)) for (const it of l.items) for (const [m, v] of Object.entries(credit(BY_ID[it.id]))) doneWeek[m] += v * it.sets.length;
  const ids = [...new Set(logs.flatMap((l) => l.items.map((i) => i.id)))];
  const lifts = ids.map((id) => { const ex = BY_ID[id], h = historyOf(s, id); return { ex, h, best: h.map((x) => sessionBest(ex, x)), st: stalled(ex, h) }; }).sort((a, b) => b.h.length - a.h.length);
  const spark = (v) => { if (v.length < 2) return `<span class="small faint">1 session</span>`; const lo = Math.min(...v), hi = Math.max(...v), W = 120, H = 46;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend"><path d="${v.map((x, i) => `${i ? "L" : "M"}${(i / (v.length - 1)) * (W - 4) + 2},${H - 4 - ((x - lo) / (hi - lo || 1)) * (H - 8)}`).join("")}"/></svg>`; };
  const last28 = logs.filter((l) => Date.parse(l.date) >= Date.now() - 28 * 86400000).length;
  app.innerHTML = `
  <h1>Progress</h1>
  <p class="lede">${logs.length ? `${logs.length} session${logs.length === 1 ? "" : "s"} logged · ${last28} in the last 4 weeks (plan: ${s.profile.days * 4})` : "Log your first session and your progress shows up here."}</p>
  <section class="card"><h2>Sets per muscle, last 7 days</h2>${volumeBars(doneWeek, w.targets)}
    <p class="small faint">Counted from what you logged, not what was planned. The shaded band is the weekly target.</p></section>
  ${lifts.length ? `<section class="card"><h2>Lifts: estimated 1-rep max per session</h2>
    ${lifts.map((l) => `<div class="lift"><div><b>${esc(l.ex.name)}</b><div class="small muted">${l.h.length} session${l.h.length === 1 ? "" : "s"}${l.st ? ` · <span class="warn">stalled</span>` : ""}</div></div>${spark(l.best)}<div class="num">${Math.round(l.best[l.best.length - 1])}${l.ex.load === "bodyweight" && !l.h.at(-1).sets.some((x) => x.w) ? " reps" : ` ${unit(s)}`}</div></div>`).join("")}
    <p class="small faint">Estimated 1RM (Epley) from your best set each session. One bad day isn't a trend: "stalled" means no new best in 4 sessions.</p></section>` : ""}`;
}

// ---------- Week ----------
function week() {
  const s = load(), w = plan(s), idx = (s.logs || []).length % w.sessions.length;
  app.innerHTML = `<h1>This week's plan</h1><p class="lede">${SPLITS[s.profile.split].label}, ${s.profile.days} days, ${s.profile.minutes} min · block ${block(s) + 1}</p>
  ${w.sessions.map((ses, i) => `<section class="card"><h2>${i === idx ? "Next · " : ""}${esc(ses.name)} · ~${ses.minutes} min</h2>
    <table>${ses.items.map((it) => `<tr><td>${esc(BY_ID[it.id].name)}</td><td class="num">${it.sets} × ${it.reps[0]}–${it.reps[1]}</td></tr>`).join("")}</table></section>`).join("")}
  <section class="card"><h2>Planned weekly sets</h2>${volumeBars(w.weekly, w.targets)}${w.shortfalls.length ? `<p class="small warn">Short: ${w.shortfalls.map((x) => `${MUSCLE_NAMES[x.muscle]} (${why(x.reasons)})`).join(" · ")}. Settings → Edit setup shows setups that cover everything.</p>` : ""}</section>`;
}

// ---------- Settings ----------
function settings() {
  const s = load();
  const lifts = [...new Set((s.logs || []).flatMap((l) => l.items.map((i) => i.id)))];
  app.innerHTML = `<h1>Settings</h1>
  <section class="card"><h2>Setup</h2><p class="muted small">${PROFILES[s.profile.place].label} · ${SPLITS[s.profile.split].label} · ${s.profile.days} days · ${s.profile.minutes} min · ${s.profile.experience} · ${s.profile.units}</p><a class="btn" href="#/setup">Edit setup</a></section>
  ${(s.profile.skip || []).length ? `<section class="card"><h2>Swapped-out exercises</h2>${s.profile.skip.map((id) => `<div class="row between"><span>${esc(BY_ID[id]?.name || id)}</span><button class="btn small ghost" data-unskip="${esc(id)}">Bring back</button></div>`).join("")}</section>` : ""}
  <section class="card"><h2>Your data</h2>
    <div class="row"><button class="btn" id="export">Export everything (JSON)</button><label class="btn ghost">Import<input type="file" id="import" accept="application/json" hidden></label></div>
    ${lifts.length ? `<div class="row mt"><select id="lift" aria-label="Lift to export">${lifts.map((id) => `<option value="${id}">${esc(BY_ID[id].name)}</option>`).join("")}</select><button class="btn ghost" id="csv">Daily outcome CSV</button></div>
    <p class="small faint">Date and estimated 1RM per session for one lift: an outcome series for a self-experiment (e.g. in N-of-1 Lab) or a spreadsheet.</p>` : ""}
  </section>
  <section class="card"><h2>Start over</h2><button class="btn ghost" id="reset">Erase setup and log on this device</button></section>`;
  const dl = (name, text, type) => { const u = URL.createObjectURL(new Blob([text], { type })); Object.assign(document.createElement("a"), { href: u, download: name }).click(); URL.revokeObjectURL(u); };
  app.querySelectorAll("[data-unskip]").forEach((b) => (b.onclick = () => { const st = load(); st.profile.skip = st.profile.skip.filter((x) => x !== b.dataset.unskip); delete st.draft; save(st); settings(); }));
  $("#export").onclick = () => dl("setwise.json", JSON.stringify({ app: "setwise", version: 1, exportedAt: new Date().toISOString(), ...load() }, null, 2), "application/json");
  $("#import").onchange = async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (d.app !== "setwise" || !d.profile || !Array.isArray(d.logs)) throw new Error("not a Setwise export");
      if (!confirm(`Replace this device's data with ${d.logs.length} logged sessions from the file?`)) return;
      save({ profile: d.profile, startedAt: d.startedAt, logs: d.logs }); toast("Imported."); route();
    } catch (x) { toast(`Couldn't import: ${x.message}`); }
  };
  const c = $("#csv");
  if (c) c.onclick = () => { const id = $("#lift").value, ex = BY_ID[id]; dl(`${id}.csv`, `date,${id}_e1rm\n${historyOf(load(), id).map((h) => `${h.date.slice(0, 10)},${r1(sessionBest(ex, h))}`).join("\n")}\n`, "text/csv"); };
  $("#reset").onclick = () => { if (confirm("Erase your setup and every logged session on this device? Export first if you want a copy.")) { localStorage.removeItem(KEY); location.hash = "#/setup"; } };
}

/** Bar geometry is set through the CSSOM: the CSP blocks inline style attributes, not script-set styles. */
function applyBars() {
  app.querySelectorAll(".track [data-w]").forEach((el) => { el.style.width = `${el.dataset.w}%`; if (el.dataset.l) el.style.left = `${el.dataset.l}%`; });
}
new MutationObserver(applyBars).observe(app, { childList: true });

function route() {
  const s = load(), r = (location.hash.match(/^#\/(\w+)/) || [])[1] || (s.profile ? "today" : "setup");
  const go = !s.profile ? "setup" : r;
  nav(go);
  ({ setup, today, progress, week, settings }[go] || today)();
  window.scrollTo({ top: 0 });
}
addEventListener("hashchange", route);
route();
