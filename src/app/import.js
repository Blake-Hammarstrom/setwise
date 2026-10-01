// "Paste, photo or speak your routine". Text comes from typing, pasting, the phone's Live Text (copy text out of a
// photo) or dictation; the parser turns it into days and exercises, and you confirm anything it isn't sure about.
import { BY_ID } from "../engine/exercises.js";
import { CONFIDENT, parseRoutine } from "../engine/parse.js";
import { openPicker } from "./picker.js";
import { load, save } from "./state.js";
import { $, $$, esc, toast } from "./ui.js";

const EXAMPLE = "Push\nBench press 4x6-8\nIncline DB press 3x10\nLateral raises 4x15\nTricep pushdowns 3x12\n\nPull\nPull ups 4x8\nBarbell row 4x8\nHammer curls 3x12";
let text = "", preview = null, listening = null;
// "3x10" (one rep target) becomes 10–12: double progression needs a range to climb through. Shown before saving.
const finalReps = (it) => (it.reps && it.reps[0] > 0 && it.reps[1] >= it.reps[0] ? (it.reps[0] === it.reps[1] ? [it.reps[0], it.reps[0] + 2] : it.reps) : [...BY_ID[it.id].reps]);
const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export function importer(app, go) {
  const draw = () => preview ? drawPreview() : drawInput();

  function drawInput() {
    app.innerHTML = `<h1>Bring your routine</h1>
    <p class="lede">Paste it, copy it from a photo, or say it. We'll turn it into days and exercises, and you check anything we're unsure about.</p>
    <textarea id="rt" class="routine-text" placeholder="${esc(EXAMPLE)}" aria-label="Your routine">${esc(text)}</textarea>
    <div class="row mt-s">${SR ? `<button class="btn" id="speak">${listening ? "■ Stop" : "🎤 Speak"}</button>` : ""}<button class="btn primary" id="read">Read my routine</button></div>
    ${listening ? `<p class="small listening">Listening… say a day, then the exercises: "push day, bench press four sets of eight, then incline dumbbell press three by ten…"</p>` : ""}
    <section class="card small muted">
      <p><b>From a photo or screenshot:</b> open it in Photos, press and hold on the text, tap <b>Select All</b> then <b>Copy</b>, and paste it above. (iPhone and most Android phones read text in photos on the device.)</p>
      <p><b>By voice:</b> ${SR ? "tap 🎤 Speak, or " : ""}tap the microphone on your keyboard and talk. Say “next” or “then” between exercises.</p>
      ${SR ? `<p class="faint">🎤 Speak uses your browser's speech service (Apple or Google) to turn audio into text. Nothing else leaves your device.</p>` : ""}
      <p>Writing tips: one exercise per line, sets × reps like <b>3x8</b>, <b>4x6-8</b> or <b>3 sets of 10</b>; day names like <b>Push</b>, <b>Day 2</b> or <b>Monday</b> on their own line.</p>
    </section>`;
    const ta = $("#rt", app);
    ta.oninput = () => { text = ta.value; };
    $("#read", app).onclick = () => {
      text = ta.value;
      const r = parseRoutine(text, load().profile.equipment);
      if (!r.days.length) return toast("Couldn't find any exercises. Try one per line, like “Bench press 3x8”.");
      stopListening(); preview = r; draw();
    };
    const sp = $("#speak", app);
    if (sp) sp.onclick = () => (listening ? stopListening() : startListening());
  }

  function startListening() {
    try {
      const rec = new SR();
      rec.lang = navigator.language || "en-US"; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text = `${text}${text && !text.endsWith("\n") ? " " : ""}${e.results[i][0].transcript.trim()}`;
        const ta = $("#rt", app); if (ta) ta.value = text;
      };
      rec.onerror = (e) => { toast(e.error === "not-allowed" ? "Microphone access was blocked. Use the keyboard's mic instead." : `Speech stopped (${e.error}).`); stopListening(); };
      rec.onend = () => { if (listening) stopListening(); };
      rec.start(); listening = rec; draw();
    } catch { toast("Speech isn't available here. Use the keyboard's mic instead."); }
  }
  function stopListening() { const r = listening; listening = null; try { r?.stop(); } catch { /* already stopped */ } if (location.hash.startsWith("#/import") && !preview) draw(); }

  function drawPreview() {
    const unsure = preview.days.flatMap((d) => d.items).filter((i) => !i.id || i.confidence < CONFIDENT).length;
    app.innerHTML = `<h1>Check your routine</h1>
    <p class="lede">${preview.days.length} day${preview.days.length === 1 ? "" : "s"}, ${preview.days.reduce((n, d) => n + d.items.length, 0)} exercises.${unsure ? ` <b>${unsure} to check</b>: tap to pick the right exercise.` : " Everything matched."}</p>
    ${preview.days.map((d, di) => `<section class="card day-card">
      <input class="day-name" value="${esc(d.name)}" data-pdn="${di}" aria-label="Day name">
      ${d.items.map((it, ii) => {
        const ex = it.id && BY_ID[it.id], sure = it.id && it.confidence >= CONFIDENT, reps = ex ? finalReps(it) : it.reps;
        return `<div class="r-item ${sure ? "" : "unsure"}">
          <button class="r-name" data-pick="${di}:${ii}">${ex ? esc(ex.name) : "Not recognized: tap to choose"}<span>“${esc(it.line)}”${sure ? "" : ex ? " · best guess, tap to check" : ""}</span></button>
          <div class="r-controls"><span>${it.sets} sets × ${reps ? `${reps[0]}–${reps[1]}` : "?"} reps</span><span class="grow"></span>
            ${ex && !sure ? `<button class="btn small" data-ok="${di}:${ii}">Looks right</button>` : ""}<button class="icon" data-rm="${di}:${ii}" aria-label="Remove">✕</button></div>
        </div>`;
      }).join("")}</section>`).join("")}
    <div class="row"><button class="btn ghost" id="back">‹ Edit text</button></div>
    <div class="sticky"><button class="btn primary" id="use">Use this routine</button></div>`;
    const ij = (v) => v.split(":").map(Number);
    $$("[data-pdn]", app).forEach((i) => (i.onchange = () => { preview.days[+i.dataset.pdn].name = i.value.trim() || preview.days[+i.dataset.pdn].name; }));
    $$("[data-pick]", app).forEach((b) => (b.onclick = () => {
      const [d, i] = ij(b.dataset.pick), it = preview.days[d].items[i];
      const phrase = it.line.replace(/\d+\s*(x|sets?|reps?|by)[\s\d-]*/gi, "").replace(/[\d-]+/g, "").trim();
      openPicker({ title: "Which exercise?", query: it.id ? "" : phrase, swapFor: it.id || undefined, onPick: (id) => { Object.assign(it, { id, confidence: 1 }); draw(); } });
    }));
    $$("[data-ok]", app).forEach((b) => (b.onclick = () => { const [d, i] = ij(b.dataset.ok); preview.days[d].items[i].confidence = 1; draw(); }));
    $$("[data-rm]", app).forEach((b) => (b.onclick = () => { const [d, i] = ij(b.dataset.rm); preview.days[d].items.splice(i, 1); preview.days = preview.days.filter((x) => x.items.length); if (!preview.days.length) preview = null; draw(); }));
    $("#back", app).onclick = () => { preview = null; draw(); };
    $("#use", app).onclick = () => {
      const missing = preview.days.flatMap((d) => d.items).filter((i) => !i.id).length;
      if (missing && !confirm(`${missing} line${missing === 1 ? " isn't" : "s aren't"} matched to an exercise and will be left out. Continue?`)) return;
      const st = load();
      if (st.routine?.days?.some((d) => d.items.length) && !confirm("Replace your current routine with this one? Your training log is kept.")) return;
      st.routine = { days: preview.days.map((d) => ({ name: d.name, items: d.items.filter((i) => i.id).map((i) => ({ id: i.id, sets: Math.max(1, Math.min(10, i.sets)), reps: finalReps(i) })) })).filter((d) => d.items.length) };
      st.profile.split = "custom";
      if (!st.profile.days || st.profile.days < st.routine.days.length) st.profile.days = Math.min(7, st.routine.days.length);
      delete st.draft; save(st);
      preview = null; text = "";
      toast("Routine saved. Adjust anything in the editor."); go("routine");
    };
  }

  draw();
}
