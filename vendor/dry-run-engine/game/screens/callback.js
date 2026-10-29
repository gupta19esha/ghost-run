// The callback: a deferred text landing, months after the choice that caused it. Bare ground
// and nothing else, so it reads as the past catching up (UI.md screens table). No artboard
// exists; the type is the consequence's result line. Leaves after 3.5 seconds, sooner on a tap.

import { timerFoot, leaveAfter } from "./timed.js";

// text: the deferred text, filled by text/
export function callbackScreen({ text, holdMs, hold, onDone }) {
  const screen = document.createElement("section");
  screen.className = "screen callback";
  screen.dataset.screen = "callback";

  const grow = document.createElement("div");
  grow.className = "grow";
  const line = document.createElement("p");
  line.className = "callback-text";
  line.textContent = text;
  const growAfter = document.createElement("div");
  growAfter.className = "grow";

  screen.append(grow, line, growAfter, timerFoot(holdMs));
  return leaveAfter(screen, { holdMs, hold, onDone });
}
