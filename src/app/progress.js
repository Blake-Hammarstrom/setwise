// Progress: logged volume vs targets, lift trends, and the full history (editable: mistakes happen mid-set).
import { BY_ID, MUSCLES, credit } from "../engine/exercises.js";
import { targets } from "../engine/generator.js";
import { sessionBest, stalled } from "../engine/progression.js";
import { exName, historyOf, load, nextIndex, save, sessionsOf } from "./state.js";
import { $, $$, applyBars, closeSheet, esc, r1, sheet, toast, volumeBars } from "./ui.js";

export function progress(app) {
  const s = load(), logs = s.logs || [], T = targets(s.profile.experience), since = Date.now() - 7 * 86400000, units = s.profile.units;
  const doneWeek = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const l of logs.filter((l) => Date.parse(l.date) >= since)) for (const it of l.items) if (BY_ID[it.id]) for (const [m, v] of Object.entries(credit(BY_ID[it.id]))) doneWeek[m] += v * it.sets.length;
  const ids = [...new Set(logs.flatMap((l) => l.items.map((i) => i.id)))].filter((id) => BY_ID[id]);
  const lifts = ids.map((id) => { const ex = BY_ID[id], h = historyOf(s, id); return { id, ex, h, best: h.map((x) => sessionBest(ex, x)), st: stalled(ex, h) }; })
    .sort((a, b) => b.h.length - a.h.length || a.ex.name.localeCompare(b.ex.name));
  const spark = (v) => {
    if (v.length < 2) return `<span class="small faint">first session</span>`;
    const lo = Math.min(...v), hi = Math.max(...v), W = 120, H = 40;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend over ${v.length} sessions"><path d="${v.map((x, i) => `${i ? "L" : "M"}${((i / (v.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 4 - ((x - lo) / (hi - lo || 1)) * (H - 8)).toFixed(1)}`).join("")}"/></svg>`;
  };
  const weeks = 4, recent = logs.filter((l) => Date.parse(l.date) >= Date.now() - weeks * 7 * 86400000).length;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  app.innerHTML = `
  <h1>Progress</h1>
  <p class="lede">${logs.length ? `${logs.length} session${logs.length === 1 ? "" : "s"} logged · ${recent} in the last ${weeks} weeks (plan: ${s.profile.days * weeks})` : "Finish your first session and your progress shows up here."}</p>
  <section class="card"><h2>Sets per muscle, last 7 days</h2>${volumeBars(doneWeek, T)}<p class="small faint">From what you logged. The shaded band is the weekly target.</p></section>
  ${lifts.length ? `<section class="card"><h2>Lifts · estimated 1-rep max per session</h2>
    ${lifts.map((l) => { const unloaded = l.ex.load === "bodyweight" && !l.h.at(-1).sets.some((x) => x.w); const first = l.best[0], lastV = l.best.at(-1);
      return `<div class="lift"><div><b>${esc(l.ex.name)}</b><div class="small muted">${l.h.length} session${l.h.length === 1 ? "" : "s"}${l.h.length > 1 ? ` · ${lastV >= first ? "+" : ""}${Math.round(lastV - first)}${unloaded ? " reps" : ` ${units}`} since first` : ""}${l.st ? ` · <span class="warn">stalled: try a swap</span>` : ""}</div></div>${spark(l.best)}<div class="num">${Math.round(lastV)}${unloaded ? " reps" : ` ${units}`}</div></div>`; }).join("")}
    <p class="small faint">Estimated 1RM (Epley) from your best set each session. One bad day isn't a trend: "stalled" means no new best in 4 sessions.</p></section>` : ""}
  ${logs.length ? `<section class="card"><h2>History</h2>${[...logs].reverse().slice(0, 40).map((l) => { const i = logs.indexOf(l); return `<button class="pick-row" data-log="${i}"><b>${esc(l.day || "Session")} · ${fmtDate(l.date)}</b><span>${l.items.map((it) => `${exName(it.id)} ${it.sets.length}×`).join(", ")}</span></button>`; }).join("")}</section>` : ""}`;
  applyBars(app);
  $$("[data-log]", app).forEach((b) => (b.onclick = () => editLog(app, +b.dataset.log)));
}

function editLog(app, i) {
  const s = load(), l = s.logs[i];
  const body = sheet(`${l.day || "Session"} · ${new Date(l.date).toLocaleDateString()}`, `
    ${l.items.map((it, k) => `<div class="ex"><b>${esc(exName(it.id))}</b><div class="sets mt-s">${it.sets.map((x, j) => `<div class="set"><span class="n">${j + 1}</span>
      <input inputmode="decimal" value="${x.w}" data-ew="${k}:${j}" aria-label="Weight"><input inputmode="numeric" value="${x.reps}" data-er="${k}:${j}" aria-label="Reps"><button class="icon" data-ex="${k}:${j}" aria-label="Delete set">✕</button></div>`).join("")}</div></div>`).join("")}
    <div class="row mt"><button class="btn primary" id="lg-save">Save changes</button><button class="btn ghost danger" id="lg-del">Delete session</button></div>`);
  const edit = JSON.parse(JSON.stringify(l));
  $$("[data-ew]", body).forEach((inp) => (inp.onchange = () => { const [k, j] = inp.dataset.ew.split(":").map(Number); edit.items[k].sets[j].w = Number(inp.value) || 0; }));
  $$("[data-er]", body).forEach((inp) => (inp.onchange = () => { const [k, j] = inp.dataset.er.split(":").map(Number); edit.items[k].sets[j].reps = Math.max(0, Math.round(Number(inp.value) || 0)); }));
  $$("[data-ex]", body).forEach((b) => (b.onclick = () => { const [k, j] = b.dataset.ex.split(":").map(Number); edit.items[k].sets[j] = null; b.closest(".set").remove(); }));
  $("#lg-save", body).onclick = () => {
    const st = load();
    edit.items = edit.items.map((it) => ({ ...it, sets: it.sets.filter((x) => x && x.reps > 0) })).filter((it) => it.sets.length);
    if (!edit.items.length) st.logs.splice(i, 1); else st.logs[i] = edit;
    save(st); closeSheet(); progress(app); toast("Session updated.");
  };
  $("#lg-del", body).onclick = () => {
    if (!confirm("Delete this session from your log? This can't be undone (unless you have a backup).")) return;
    const st = load(); st.logs.splice(i, 1); save(st); closeSheet(); progress(app); toast("Session deleted.");
  };
}

export function plan(app) {
  const s = load();
  const days = sessionsOf(s), next = nextIndex(s, days.length);
  app.innerHTML = `<h1>${s.routine ? "Your routine" : "Your plan"}</h1>
  <p class="lede">${days.length} day${days.length === 1 ? "" : "s"} in rotation · ${s.profile.days} days a week${s.routine ? "" : " · exercises refresh every 4 weeks, main lifts every 8"}</p>
  <div class="row"><a class="btn" href="#/routine" id="edit">${s.routine ? "Edit routine" : "Customize this plan"}</a></div>
  ${days.map((d, i) => `<section class="card"><h2>${i === next ? "Next · " : ""}${esc(d.name)}</h2><table>${d.items.map((it) => `<tr><td>${esc(exName(it.id))}</td><td class="num">${it.sets} × ${it.reps[0]}–${it.reps[1]}</td></tr>`).join("")}</table></section>`).join("")}`;
  $("#edit", app).onclick = (e) => {
    if (s.routine) return;
    e.preventDefault();
    if (!confirm("Turn this plan into your own editable routine? It stops auto-refreshing exercises; progression and tracking stay the same.")) return;
    const st = load();
    st.routine = { days: days.map((d) => ({ name: d.name, items: d.items.map(({ id, sets, reps }) => ({ id, sets, reps: [...reps] })) })) };
    st.profile.split = "custom"; delete st.draft; save(st); location.hash = "#/routine";
  };
}
