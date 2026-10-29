// How it works (ruled 30 September 2026, ONBOARDING.md section 8): opened from Home, for every
// player. It shows the board again, read-only: the landing's lede and bullets, then what each
// of the four measures, in the words the month 1 close uses (UI.md rule 8: explain the board,
// never the moves). A player past month 1 has no other way to see what a bar means.
//
// Close sits at the top and at the foot. The landing's copy and the bar lines are imported, not repeated, so each lives in one place.
// Every line is the product owner's, approved 30 September 2026 (ONBOARDING.md section 8.1).
//
// Testing only: when TEST_TOOLS is on (game/config.js), the foot carries "Start again", which
// deletes the run after a confirm step. It never appears in a player build: it would let a
// player undo a bad month and skip the one-month-a-day limit.

import { LEDE, POINTS } from "./landing.js";
import { BAR_LINES } from "./bar-lines.js";

// The link says what it opens; the heading says what is on the page
const HEADING = "What the four things mean";
const RESTART = "Start again (testing)";
const CONFIRM = "Start again from 22? Your run is deleted and cannot be recovered.";
const CONFIRM_YES = "Delete and start again";
const CONFIRM_NO = "Keep this run";

const CLOSE = "Close";

// The names each one already carries on Home and the month close
const BARS = [
  ["netWorth", "Net worth"],
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

function closeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  return svg;
}

// The testing foot: a link, then in its place the question and two buttons
function restartBlock(onRestart) {
  const holder = document.createElement("div");
  holder.className = "how-restart";
  const link = document.createElement("button");
  link.type = "button";
  link.className = "how-restart-link";
  link.textContent = RESTART;
  link.addEventListener("click", () => {
    const question = document.createElement("p");
    question.className = "how-confirm";
    question.textContent = CONFIRM;
    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "close-button how-confirm-yes";
    yes.textContent = CONFIRM_YES;
    yes.addEventListener("click", onRestart, { once: true });
    const no = document.createElement("button");
    no.type = "button";
    no.className = "close-button";
    no.textContent = CONFIRM_NO;
    no.addEventListener("click", () => holder.replaceChildren(link));
    holder.replaceChildren(question, yes, no);
    // The question opens below the fold on a small phone: bring it and its buttons into view
    no.scrollIntoView({ block: "end" });
  });
  holder.append(link);
  return holder;
}

// testTools: show the testing foot. onRestart: delete the run and start again.
export function howItWorksScreen({ testTools = false, onRestart, onClose }) {
  const screen = document.createElement("section");
  screen.className = "screen how";
  screen.dataset.screen = "how";

  const top = document.createElement("div");
  top.className = "how-top";
  const heading = document.createElement("h1");
  heading.className = "how-heading";
  heading.textContent = HEADING;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button";
  close.setAttribute("aria-label", CLOSE);
  close.append(closeIcon());
  close.addEventListener("click", onClose, { once: true });
  top.append(heading, close);

  const lede = document.createElement("p");
  lede.className = "how-lede";
  lede.textContent = LEDE;

  const points = document.createElement("ul");
  points.className = "landing-points how-points";
  for (const point of POINTS) {
    const item = document.createElement("li");
    const words = document.createElement("span");
    words.textContent = point;
    item.append(words);
    points.append(item);
  }

  const bars = document.createElement("dl");
  bars.className = "how-bars";
  for (const [key, name] of BARS) {
    const term = document.createElement("dt");
    term.className = "bar-name";
    term.textContent = name;
    const meaning = document.createElement("dd");
    meaning.className = "how-bar-line";
    meaning.textContent = BAR_LINES[key];
    bars.append(term, meaning);
  }

  // Close at the foot as well as the top: on a small phone the page scrolls, and a reader who
  // reaches the end should not have to scroll back up to leave. Month close's word, "Close"
  const foot = document.createElement("button");
  foot.type = "button";
  foot.className = "close-button how-close";
  foot.textContent = CLOSE;
  foot.addEventListener("click", onClose, { once: true });

  screen.append(top, lede, points, bars, foot);
  if (testTools) screen.append(restartBlock(onRestart));
  return screen;
}
