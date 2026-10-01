// Shared UI bits: escaping, toast, bottom sheet, volume bars, plain-language reasons.
import { MUSCLES, MUSCLE_NAMES } from "../engine/exercises.js";

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const r1 = (x) => Math.round(x * 10) / 10;

export function toast(m, ms = 2800) {
  const t = $("#toast");
  t.textContent = m; t.classList.add("show");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), ms);
}

/** Bottom sheet (pickers, editors). Returns the content element; closes on backdrop, Escape, or close(). */
export function sheet(title, html) {
  closeSheet();
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><b>${esc(title)}</b><button class="btn small ghost" data-close aria-label="Close">Close</button></div><div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-close]")) closeSheet(); });
  sheet.key = (e) => { if (e.key === "Escape") closeSheet(); };
  addEventListener("keydown", sheet.key);
  requestAnimationFrame(() => wrap.classList.add("open"));
  return $(".sheet-body", wrap);
}
export function closeSheet() {
  $$(".sheet-wrap").forEach((w) => w.remove());
  if (sheet.key) removeEventListener("keydown", sheet.key);
}

/** Weekly sets vs target range per muscle. Geometry is applied via the CSSOM (the CSP forbids inline styles). */
export function volumeBars(done, T) {
  const max = Math.max(...MUSCLES.map((m) => Math.max(T[m][1] + 2, done[m])));
  return `<div class="bars">${MUSCLES.filter((m) => T[m][1] > 0).map((m) => {
    const short = done[m] < T[m][0];
    return `<div class="bar"><span>${MUSCLE_NAMES[m]}</span><div class="track"><div class="range" data-l="${(100 * T[m][0]) / max}" data-w="${(100 * (T[m][1] - T[m][0])) / max}"></div><div class="fill ${short ? "short" : ""}" data-w="${(100 * Math.min(done[m], max)) / max}"></div></div><span class="num">${r1(done[m])} / ${T[m][0]}–${T[m][1]}</span></div>`;
  }).join("")}</div>`;
}
export function applyBars(root = document) {
  $$(".track [data-w]", root).forEach((el) => { el.style.width = `${el.dataset.w}%`; if (el.dataset.l) el.style.left = `${el.dataset.l}%`; });
}

const WHY = [["split frequency", "trained once a week"], ["equipment", "no exercise for it with your kit"], ["equipment variety (one exercise trains this with your kit)", "only one exercise for it with your kit"],
  ["per-session ceiling", "10-set limit per session"], ["time", "session length"], ["split", "not in this split"], ["selection", "the planner couldn't fit it"]];
export const why = (reasons) => (WHY.find(([k]) => reasons.includes(k)) || [, reasons[0]])[1];

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
export const download = (name, text, type) => {
  const u = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement("a"), { href: u, download: name }).click();
  URL.revokeObjectURL(u);
};
