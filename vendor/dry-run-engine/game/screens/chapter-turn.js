// The turn of a chapter: its own screen, between the last month's close and the chapter card,
// or between the report and the next chapter's first Home, so moving from one chapter to the
// next is an event and not one screen cut to another. The cuts either side stay cuts; the
// motion is inside this screen, in the game's own motion language (LANDING-MOTION.md): the
// mark's ticks drawing round and turning marigold, the lines rising in as the landing's title
// does.
//
// Closing a chapter: the mark stands with every month but the last lit; the last lights, then
// the light runs round the whole ring once, the mark settles, and "Chapter one closed", its
// title and its ages rise in. Opening one: the new chapter's ring draws itself round, unlit,
// and its number, title and the player's age rise in.
//
// It leaves by itself (UI.md rule 2), showing its timer. A tap while it moves finishes the
// motion; a tap once it is still leaves. With reduced motion on, it stands still from the start.
// Every piece moves from its start to the still screen's style, so taking the .playing class
// away at any moment shows the still screen.

import { leaveAfter, timerFoot } from "./timed.js";

const CLOSED = "closed";
const YOU_ARE = (age) => `You are ${age}.`;

// The mark, larger: one tick for each month of the chapter round a circle, lit marigold up to
// lit, the rest slate. The same drawing as the landing's (design/dry-run-mark.svg)
export function mark(months, lit) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "turn-mark");
  svg.setAttribute("viewBox", "0 0 118 118");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const round = (n) => Math.round(n * 100) / 100;
  let ticks = "";
  for (let i = 0; i < months; i++) {
    const angle = ((i * (360 / months) - 90) * Math.PI) / 180;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    const state = i < lit - 1 ? " lit" : i === lit - 1 ? " lit last" : "";
    ticks += `<line class="turn-tick${state}" style="--i: ${i}" pathLength="1" x1="${round(59 + c * 30)}" y1="${round(59 + s * 30)}" x2="${round(59 + c * 49)}" y2="${round(59 + s * 49)}"/>`;
  }
  svg.innerHTML = `
    <circle cx="59" cy="59" r="59" fill="var(--deep)"/>
    <g stroke-width="${months > 24 ? 4 : 5}" stroke-linecap="round">${ticks}</g>
    <circle cx="59" cy="59" r="17" fill="var(--ink)"/>`;
  return svg;
}

function line(className, text, n) {
  const node = document.createElement("p");
  node.className = `turn-line ${className}`;
  node.style.setProperty("--n", String(n));
  node.textContent = text;
  return node;
}

// way: "close" or "open". chapter: { number in words, title, months: how many months it has
// (for a chapter being opened, how many the sheet has written) }. ages: { from, to } for a
// close; age: the player's for an open. holdMs, hold: as every screen that leaves by itself.
export function chapterTurnScreen({ way, chapter, ages = null, age = null, holdMs, hold = false, onDone }) {
  const screen = document.createElement("section");
  screen.className = `screen chapter-turn turn-${way}`;
  screen.dataset.screen = "turn";

  const closing = way === "close";
  const stage = document.createElement("div");
  stage.className = "turn-stage";
  stage.append(
    mark(chapter.months, closing ? chapter.months : 0),
    line("turn-label month-label", closing ? `Chapter ${chapter.number} ${CLOSED}` : `Chapter ${chapter.number}`, 0),
    line("turn-title", chapter.title, 1),
    line("turn-ages", closing ? `${ages.from} to ${ages.to}` : YOU_ARE(age), 2),
  );
  screen.append(stage, timerFoot(holdMs));

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => screen.classList.remove("playing");
  // While it moves, a tap finishes it and goes no further; once it is still, a tap leaves.
  // Capture runs first on the screen itself, before leaveAfter's tap
  screen.addEventListener("click", (e) => {
    if (!screen.classList.contains("playing")) return;
    e.stopImmediatePropagation();
    finish();
  }, { capture: true });
  return leaveAfter(screen, {
    holdMs,
    hold,
    onStart: () => {
      if (reduced) return;
      screen.classList.add("playing");
      // The motion's last piece ends here; the screen is then still
      screen.addEventListener("animationend", (e) => {
        if (e.target.classList.contains("turn-ages")) finish();
      });
    },
    onDone,
  });
}
