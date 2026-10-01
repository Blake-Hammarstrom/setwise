// Setwise: router + service worker. Everything runs and stays in this browser.
import { onboarding } from "./onboarding.js";
import { plan, progress } from "./progress.js";
import { routineEditor } from "./routine-editor.js";
import { settings } from "./settings.js";
import { load } from "./state.js";
import { leaveToday, today } from "./today.js";
import { $, closeSheet } from "./ui.js";

const app = $("#app");
const TABS = [["today", "Today"], ["plan", "Plan"], ["progress", "Progress"], ["settings", "Settings"]];

export function go(r) { if (location.hash === `#/${r}`) route(); else location.hash = `#/${r}`; }

function route() {
  const s = load(), want = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const r = !s.profile ? "setup" : want || "today";
  closeSheet();
  if (r !== "today") leaveToday();
  $("#nav").innerHTML = s.profile && r !== "setup" ? TABS.map(([k, l]) => `<a href="#/${k}" class="${r === k || (r === "routine" && k === "plan") ? "on" : ""}">${l}</a>`).join("") : "";
  ({ setup: () => onboarding(app, go), today: () => today(app, go), plan: () => plan(app), routine: () => routineEditor(app, go), progress: () => progress(app), settings: () => settings(app, go) }[r] || (() => today(app, go)))();
  window.scrollTo({ top: 0 });
}
addEventListener("hashchange", route);
route();

// Offline: the service worker caches the app shell (works at the gym with no signal). Same-origin only.
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
