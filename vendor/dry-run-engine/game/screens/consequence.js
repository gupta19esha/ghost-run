// The consequence screen, built to design/Consequence.html: the same illustration, muted,
// the chosen card riding over its bottom edge, the result line, and the bar the choice moved,
// moving. It leaves by itself (UI.md rule 2); a tap anywhere leaves sooner.
//
// Which bar moved, and by how much, is the engine's: the "bars" effect applyDecision returns
// holds every bar before and after. The UI only draws it. When no bar moved, none is shown.
//
// The first time a bar moves on a result, one line under it says what the bar measures
// (UI.md rule 8, game/screens/bar-lines.js). The line is the same whichever way the bar
// moved, and sits in slate, not the bar's colour, so it never reads as a verdict.

import { illustration } from "./illustrations.js";
import { timerFoot, leaveAfter } from "./timed.js";
import { arrow } from "./moves.js";

const UP = "up";
const DOWN = "down";

// Where a choice moved more than one bar, the one that moved most is shown. The screen has
// room for one (design/Consequence.html).
const BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

export function barMoved({ before, after }) {
  let moved = null;
  for (const [key, name] of BARS) {
    const size = Math.abs(after[key] - before[key]);
    if (size > 0 && (!moved || size > moved.size)) moved = { key, name, before: before[key], after: after[key], size };
  }
  return moved;
}

const pct = (value) => `${value}%`;

function chip(dir) {
  const holder = document.createElement("span");
  holder.className = `chip chip-${dir}`;
  holder.append(arrow(dir), dir === "up" ? UP : DOWN);
  return holder;
}

// The bar starts where it was, then moves. Rising: the gain grows hatched past the old
// level. Falling: the bar shrinks and the loss stays behind it, hatched, so the drop reads.
// danger: Safety below the engine's danger line, vermilion whatever it did (UI.md rule 4)
function bar(move, danger, explanation) {
  const direction = move.after > move.before ? "up" : "down";
  const section = document.createElement("div");
  section.className = `bar bar-${direction}${danger ? " danger" : ""}`;
  section.dataset.bar = move.key;

  const head = document.createElement("div");
  head.className = "bar-head";
  const name = document.createElement("span");
  name.className = "bar-name";
  name.textContent = move.name;
  head.append(name, chip(direction));

  const track = document.createElement("div");
  track.className = "bar-track";
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `${move.name} ${direction === "up" ? UP : DOWN}`);
  const solid = document.createElement("div");
  solid.className = "bar-solid";
  const change = document.createElement("div");
  change.className = "bar-change";
  solid.style.width = pct(move.before);
  change.style.width = "0%";
  track.append(solid, change);

  section.append(head, track);
  if (explanation) {
    const line = document.createElement("p");
    line.className = "bar-explained";
    line.textContent = explanation;
    section.append(line);
  }
  section.play = () => {
    solid.style.width = pct(Math.min(move.before, move.after));
    change.style.width = pct(move.size);
  };
  return section;
}

// option: the chosen option. line: the result, filled by text/,
// or null when there is nothing to say. bars: the engine's "bars" effect.
// safetyDanger: the engine's safetyInDanger after the choice. hold: stay on screen, for
// screenshots only. explanation: the moved bar's line, the first time it moves, or null.
export function consequenceScreen({ decisionId, option, line, bars, explanation = null, safetyDanger, holdMs, hold, onDone }) {
  const screen = document.createElement("section");
  screen.className = "screen consequence";
  screen.dataset.screen = "consequence";

  const card = document.createElement("div");
  card.className = "chosen";
  card.textContent = option.option_label;
  const cardHolder = document.createElement("div");
  cardHolder.className = "chosen-holder";
  cardHolder.append(card);

  screen.append(illustration(decisionId, "muted"), cardHolder);

  if (line !== null) {
    const result = document.createElement("p");
    result.className = "result";
    result.textContent = line;
    screen.append(result);
  }

  const move = barMoved(bars);
  const shown = move ? bar(move, move.key === "safety" && safetyDanger, explanation) : null;
  if (shown) screen.append(shown);

  const grow = document.createElement("div");
  grow.className = "grow";
  screen.append(grow, timerFoot(holdMs));

  // The bar moves once the screen is on the page. Reading the layout fixes its starting
  // width, so the new one transitions.
  return leaveAfter(screen, {
    holdMs,
    hold,
    onStart: () => {
      if (!shown) return;
      shown.getBoundingClientRect();
      shown.play();
    },
    onDone,
  });
}
