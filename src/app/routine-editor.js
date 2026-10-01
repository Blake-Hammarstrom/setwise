// Your own routine. Start from a whole split or add ready-made days (Push, Pull, Legs…), each filled with exercises
// for your equipment, then edit anything. Saves on every change; coverage is checked live.
import { BY_ID, MUSCLE_NAMES } from "../engine/exercises.js";
import { DAY_TEMPLATES, QUICK_STARTS, planDay, targets } from "../engine/generator.js";
import { coverage } from "../engine/routine.js";
import { openPicker } from "./picker.js";
import { load, save } from "./state.js";
import { $, $$, applyBars, closeSheet, esc, sheet, toast, volumeBars } from "./ui.js";

/** A filled day of this type; repeats of a type get the next variant (Push A, Push B). */
function filledDay(st, key) {
  const n = st.routine.days.filter((d) => d.template === key).length;
  const day = planDay(key, { ...st.profile, minutes: st.profile.minutes || 60 }, n);
  const same = DAY_TEMPLATES.find((t) => t.key === key);
  if (n > 0) { day.name = `${same.label} ${String.fromCharCode(65 + n)}`; const first = st.routine.days.find((d) => d.template === key && d.name === same.label); if (first) first.name = `${same.label} A`; }
  return day;
}

export function routineEditor(app, go) {
  const mut = (f, msg) => { const st = load(); f(st.routine, st); delete st.draft; save(st); draw(); if (msg) toast(msg); };

  const addDaySheet = () => {
    const body = sheet("Add a day", `<p class="small muted">Each comes filled with exercises for your equipment. Edit anything after.</p>
      <div class="tpl-grid">${DAY_TEMPLATES.map((t) => `<button class="tpl" data-tpl="${t.key}"><b>${esc(t.label)}</b><span>${esc(t.hint)}</span></button>`).join("")}
      <button class="tpl" data-tpl=""><b>Blank day</b><span>Pick every exercise yourself</span></button></div>`);
    $$("[data-tpl]", body).forEach((b) => (b.onclick = () => {
      closeSheet();
      mut((rr, st) => { rr.days.push(b.dataset.tpl ? filledDay(st, b.dataset.tpl) : { name: `Day ${rr.days.length + 1}`, items: [] }); }, b.dataset.tpl ? `${DAY_TEMPLATES.find((t) => t.key === b.dataset.tpl).label} day added. Tap an exercise to swap it.` : "Blank day added.");
      requestAnimationFrame(() => $$(".day-card").at(-1)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }));
  };

  const draw = () => {
    const s = load();
    if (!s.routine) { go("settings"); return; }
    const r = s.routine, T = targets(s.profile.experience);
    if (!r.days.length || !r.days.some((d) => d.items.length) && r.days.every((d) => !d.template)) {
      app.innerHTML = `<h1>Build your routine</h1><p class="lede">Start from a classic split and make it yours. Every exercise can be swapped, added or removed.</p>
        <div class="routines">${QUICK_STARTS.map((q, i) => `<button class="qs-card" data-qs="${i}"><span class="rc-top"><b>${esc(q.label)}</b></span><span class="rc-days">${q.days.map((k) => DAY_TEMPLATES.find((t) => t.key === k).label).join(" · ")}</span></button>`).join("")}</div>
        <div class="row mt"><button class="btn" id="oneday">＋ Add days one at a time</button><a class="btn" href="#/import">Paste, photo or speak a routine</a></div>`;
      $$("[data-qs]", app).forEach((b) => (b.onclick = () => mut((rr, st) => {
        rr.days = [];
        for (const k of QUICK_STARTS[+b.dataset.qs].days) rr.days.push(filledDay(st, k));
      }, "Filled in. Edit anything, then start training.")));
      $("#oneday", app).onclick = () => { if (r.days.length) mut((rr) => { rr.days = []; }); addDaySheet(); };
      return;
    }
    const cov = coverage(r, T, s.profile.days);
    app.innerHTML = `
    <h1>Your routine</h1>
    <p class="lede">${r.days.length} day${r.days.length === 1 ? "" : "s"} in rotation, trained <select id="perweek" class="inline" aria-label="Days per week">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<option ${s.profile.days === d ? "selected" : ""}>${d}</option>`).join("")}</select> days a week. Tap an exercise to swap it. Changes save as you go.</p>
    ${r.days.map((d, di) => `
      <section class="card day-card">
        <div class="day-head"><input class="day-name" value="${esc(d.name)}" data-dname="${di}" aria-label="Day name">
          <div class="row tight">${d.template ? `<button class="icon" data-refill="${di}" aria-label="Refill from the ${esc(d.name)} template" title="Refill from template">↻</button>` : ""}<button class="icon" data-dup="${di}" ${di === 0 ? "disabled" : ""} aria-label="Move day up">↑</button><button class="icon" data-ddown="${di}" ${di === r.days.length - 1 ? "disabled" : ""} aria-label="Move day down">↓</button><button class="icon" data-ddel="${di}" aria-label="Remove day">✕</button></div></div>
        ${d.items.map((it, ii) => `
          <div class="r-item">
            <button class="r-name" data-swap="${di}:${ii}">${esc(BY_ID[it.id]?.name || it.id)}<span>${(BY_ID[it.id]?.primary || []).map((m) => MUSCLE_NAMES[m]).join(", ")} · tap to swap</span></button>
            <div class="r-controls">
              <div class="stepper" aria-label="Sets"><button data-sets="${di}:${ii}:-1" aria-label="Fewer sets">−</button><b>${it.sets}</b><button data-sets="${di}:${ii}:1" aria-label="More sets">+</button></div>
              <span class="faint">sets ×</span>
              <input class="rep" inputmode="numeric" value="${it.reps[0]}" data-lo="${di}:${ii}" aria-label="Reps from"><span class="faint">–</span><input class="rep" inputmode="numeric" value="${it.reps[1]}" data-hi="${di}:${ii}" aria-label="Reps to">
              <span class="grow"></span>
              <button class="icon" data-up="${di}:${ii}" ${ii === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button class="icon" data-del="${di}:${ii}" aria-label="Remove">✕</button>
            </div>
          </div>`).join("") || `<p class="muted small">No exercises yet.</p>`}
        <button class="btn small mt-s" data-add="${di}">＋ Add exercise</button>
      </section>`).join("")}
    <button class="btn wide" id="addday">＋ Add a day</button>
    <a class="btn ghost wide" href="#/import">Paste, photo or speak a routine instead</a>
    <section class="card mt"><h2>Weekly sets per muscle</h2>${volumeBars(cov.weekly, T)}
      ${cov.short.length ? `<p class="small warn">Below the weekly minimum: ${cov.short.map((m) => MUSCLE_NAMES[m]).join(", ")}. Fine if that's intentional.</p>` : `<p class="small muted">Every muscle reaches its weekly minimum.</p>`}
      ${cov.over.length ? `<p class="small warn">Well above the usual maximum: ${cov.over.map((m) => MUSCLE_NAMES[m]).join(", ")}. Recovery may suffer.</p>` : ""}
      ${cov.heavyDays.length ? `<p class="small warn">More than 10 sets for one muscle in a session: ${cov.heavyDays.map((h) => `${MUSCLE_NAMES[h.muscle]} on ${esc(h.day)}`).join(", ")}. Later sets add little.</p>` : ""}
      <p class="small faint">With ${r.days.length} days cycling over ${s.profile.days} training days a week, each day comes round ${(s.profile.days / r.days.length).toFixed(1)}× a week on average.</p>
    </section>
    <div class="sticky"><button class="btn primary" id="done">Start training</button></div>`;
    applyBars(app);

    const ij = (v) => v.split(":").map(Number);
    $("#perweek", app).onchange = (e) => mut((_, st) => { st.profile.days = Number(e.target.value); });
    $$("[data-dname]", app).forEach((i) => (i.onchange = () => mut((rr) => { rr.days[+i.dataset.dname].name = i.value.trim() || `Day ${+i.dataset.dname + 1}`; })));
    $$("[data-refill]", app).forEach((b) => (b.onclick = () => {
      const k = +b.dataset.refill, d = load().routine.days[k];
      if (!confirm(`Refill "${d.name}" with the ${DAY_TEMPLATES.find((t) => t.key === d.template).label} template? Your edits to this day are replaced.`)) return;
      mut((rr, st) => { const fresh = planDay(d.template, { ...st.profile, minutes: st.profile.minutes || 60 }, rr.days.slice(0, k).filter((x) => x.template === d.template).length); rr.days[k].items = fresh.items; }, "Refilled.");
    }));
    $$("[data-dup]", app).forEach((b) => (b.onclick = () => mut((rr) => { const k = +b.dataset.dup; [rr.days[k - 1], rr.days[k]] = [rr.days[k], rr.days[k - 1]]; })));
    $$("[data-ddown]", app).forEach((b) => (b.onclick = () => mut((rr) => { const k = +b.dataset.ddown; [rr.days[k + 1], rr.days[k]] = [rr.days[k], rr.days[k + 1]]; })));
    $$("[data-ddel]", app).forEach((b) => (b.onclick = () => {
      const k = +b.dataset.ddel, d = load().routine.days[k];
      if (d.items.length && !confirm(`Remove "${d.name}" and its ${d.items.length} exercises?`)) return;
      mut((rr) => { rr.days.splice(k, 1); });
    }));
    $$("[data-sets]", app).forEach((b) => (b.onclick = () => mut((rr) => { const [d, i, k] = ij(b.dataset.sets); rr.days[d].items[i].sets = Math.max(1, Math.min(10, rr.days[d].items[i].sets + k)); })));
    const reps = (attr, idx) => $$(`[data-${attr}]`, app).forEach((inp) => (inp.onchange = () => mut((rr) => {
      const [d, i] = ij(inp.dataset[attr]), it = rr.days[d].items[i], v = Math.max(1, Math.min(50, Math.round(Number(inp.value) || it.reps[idx])));
      it.reps[idx] = v; if (it.reps[0] >= it.reps[1]) it.reps = idx ? [Math.max(1, v - 1), v] : [v, v + 1];
    })));
    reps("lo", 0); reps("hi", 1);
    $$("[data-up]", app).forEach((b) => (b.onclick = () => mut((rr) => { const [d, i] = ij(b.dataset.up), it = rr.days[d].items; [it[i - 1], it[i]] = [it[i], it[i - 1]]; })));
    $$("[data-del]", app).forEach((b) => (b.onclick = () => mut((rr) => { const [d, i] = ij(b.dataset.del); rr.days[d].items.splice(i, 1); })));
    $$("[data-add]", app).forEach((b) => (b.onclick = () => openPicker({ title: `Add to ${load().routine.days[+b.dataset.add].name}`, exclude: load().routine.days[+b.dataset.add].items.map((x) => x.id),
      onPick: (id) => mut((rr) => { rr.days[+b.dataset.add].items.push({ id, sets: 3, reps: [...BY_ID[id].reps] }); }, `${BY_ID[id].name} added.`) })));
    $$("[data-swap]", app).forEach((b) => (b.onclick = () => { const [d, i] = ij(b.dataset.swap); openPicker({ title: "Replace with", swapFor: load().routine.days[d].items[i].id, exclude: load().routine.days[d].items.map((x) => x.id),
      onPick: (id) => mut((rr) => { rr.days[d].items[i] = { id, sets: rr.days[d].items[i].sets, reps: [...BY_ID[id].reps] }; }, `Swapped for ${BY_ID[id].name}.`) }); }));
    $("#addday", app).onclick = addDaySheet;
    $("#done", app).onclick = () => {
      if (!load().routine.days.some((d) => d.items.length)) return toast("Add at least one exercise first.");
      go("today");
    };
  };
  draw();
}
