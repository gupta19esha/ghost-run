// The road (UI.md step 6 and rule 11; HANDOFF section 4, Progress): the landing hero's road carrying
// the chapter's months, one stop a month, running down a phone and across a desktop window
// (game/desktop.css). The player's figure stands at the month they have reached. It opens the
// chapter, all dark, and it is the timeline from then on. At its far end stands the chapter card.
//
// A played stop carries its month summary, its decision's illustration small, and how net worth
// moved (UI.md rule 4). Tap it to see what you chose and the result each choice showed. An idea the
// month taught sits beside it, and opens that idea. The layoff is marked on the road once it has
// happened, by the sheet's own summary for that month. Stops ahead are dark, and say only their
// month and, locked, the title of the idea it will teach: the chapter's promise, with the body kept
// for the month that earns it. The card is drawn locked until the chapter is finished.
//
// It adds no words of its own. The close button's label is month close's "Close", the card's
// heading the card screen's, and the button that opens the chapter Home's "Play the month".

import { direction, arrow } from "./moves.js";
import { illustration } from "./illustrations.js";
import { cardCanvas } from "./certificate.js";
import { CHARACTERS, CHARACTER_VIEWBOX, characterMarkup } from "../character.js";

const CLOSE = "Close";
const CARD = "Your chapter card";
const PLAY = "Play the month";
const SVG = "http://www.w3.org/2000/svg";
// The hero's trees, one stop in every so many, on the side of the road the figure does not stand
const TREE_EVERY = 3;

export function closeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  return svg;
}

const span = (className, text = null) => {
  const el = document.createElement("span");
  el.className = className;
  if (text !== null) el.textContent = text;
  return el;
};

function drawn(className, viewBox, inner) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = inner;
  return svg;
}

function lockIcon() {
  return drawn("road-lock", "0 0 15 18",
    `<rect x="1" y="7" width="13" height="10" rx="2" fill="currentColor"/><path d="M4 7V4.5a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="2" fill="none"/>`);
}

function lockedIdea(idea) {
  const marker = span("road-idea is-locked");
  marker.append(lockIcon(), span("road-idea-title", idea.title));
  return marker;
}

// The walk: a short step along the road with a little bounce, over this long, then a beat
const WALK_MS = 900;
const WALK_HOLD_MS = 350;
const WALK_HOPS = 3;
const WALK_BOUNCE_PX = 9;
const WALK_FRAMES = 24;
const tree = () => drawn("road-tree", "0 0 40 54",
  `<rect x="17" y="26" width="6" height="28" fill="var(--deep)"/><circle cx="20" cy="20" r="20" fill="var(--deep)"/>`);

// The strip of road this stop stands on
function track(stop, index, character) {
  const el = span("road-track");
  el.append(span("road-way"));
  const dash = span("road-dash");
  dash.style.setProperty("--i", String(index));
  el.append(dash);
  if (stop.month % TREE_EVERY === 2) el.append(tree());
  if (stop.event) el.append(span("road-barrier"));
  if (stop.here) el.append(drawn("road-figure", CHARACTER_VIEWBOX, characterMarkup(character)));
  return el;
}

// stops: game/timeline.js's roadStops. chapter: { number in words, title, span, count }. money:
// text/'s formatter. open: a month to show opened. onIdea(month): opens that month's idea. card:
// chapterCard's figures or lockedChapterCard's, the far end of the road. onCard: opens it, once it
// is the player's own. onPlay: this is the chapter opening, and its button plays the first month.
// onClose otherwise: the close button. character: who stands on the road. onCharacter(id): the
// opening's choice of them. walkFrom and onWalked: a month has just closed, so the character walks
// here from that month's stop, then onWalked goes on. A tap finishes it at once.
export function timelineScreen({
  stops, chapter, money, open = null, card, onCard = null, onIdea, onPlay = null, onClose = null,
  character, onCharacter = null, walkFrom = null, onWalked = null,
}) {
  const opening = Boolean(onPlay);
  const walking = walkFrom !== null;
  const screen = document.createElement("section");
  screen.className = `screen timeline${opening ? " opening" : ""}${walking ? " walking" : ""}`;
  screen.dataset.screen = opening ? "start" : walking ? "walk" : "timeline";

  const top = document.createElement("div");
  top.className = "timeline-top";
  const heading = document.createElement("div");
  if (chapter) {
    const label = document.createElement("div");
    label.className = "month-label";
    label.textContent = `Chapter ${chapter.number}`;
    const title = document.createElement("div");
    title.className = "chapter-title";
    title.textContent = chapter.title;
    const line = document.createElement("div");
    line.className = "road-span";
    line.textContent = `${chapter.span} · ${chapter.count}`;
    heading.append(label, title, line);
  }
  top.append(heading);
  if (!opening && !walking) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "icon-button";
    close.setAttribute("aria-label", CLOSE);
    close.append(closeIcon());
    close.addEventListener("click", onClose, { once: true });
    top.append(close);
  }

  const road = document.createElement("ol");
  road.className = "road";
  const toggles = [];
  stops.forEach((stop, index) => {
    const item = document.createElement("li");
    item.className = `road-stop ${stop.played ? "is-played" : "is-ahead"}${stop.event ? " has-event" : ""}`;
    item.dataset.month = String(stop.month);
    if (stop.here) item.setAttribute("aria-current", "step");
    item.append(track(stop, index, character));

    const body = document.createElement("div");
    body.className = "road-body";
    item.append(body);

    if (!stop.played) {
      body.append(span("road-ahead-month", `Month ${stop.month}`));
      if (stop.lockedIdea) body.append(lockedIdea(stop.lockedIdea));
      road.append(item);
      return;
    }

    const dir = stop.change === null ? "flat" : direction(stop.change);
    item.classList.add(`move-${dir}`);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "road-row";
    row.setAttribute("aria-expanded", "false");
    const thumb = span("road-thumb");
    thumb.append(illustration(stop.decisionId, "full"));
    const words = span("road-words");
    words.append(span("road-when", `Month ${stop.month} · you are ${stop.age}`));
    if (stop.summary) words.append(span("road-summary", stop.summary));
    if (dir !== "flat") {
      const chip = span(`chip move-${dir}`);
      const amount = span("tabular", money(Math.abs(stop.change)));
      chip.append(arrow(dir), amount);
      words.append(chip);
    }
    row.append(thumb, words);
    body.append(row);

    if (stop.idea) {
      const idea = document.createElement("button");
      idea.type = "button";
      idea.className = "road-idea";
      idea.append(span("road-idea-mark"), span("road-idea-title", stop.idea.title));
      idea.addEventListener("click", () => onIdea(stop.month), { once: true });
      body.append(idea);
    } else if (stop.lockedIdea) {
      body.append(lockedIdea(stop.lockedIdea));
    }

    const detail = document.createElement("div");
    detail.className = "timeline-detail";
    detail.id = `month-${stop.month}`;
    detail.hidden = true;
    row.setAttribute("aria-controls", detail.id);
    for (const choice of stop.choices) {
      const card = document.createElement("div");
      card.className = "chosen";
      card.textContent = choice.label;
      detail.append(card);
      if (choice.line !== null) {
        const line = document.createElement("p");
        line.className = "timeline-line";
        line.textContent = choice.line;
        detail.append(line);
      }
    }
    body.append(detail);

    // One month open at a time, so the road stays a road and not a wall of text
    const toggle = (show) => {
      detail.hidden = !show;
      row.setAttribute("aria-expanded", String(show));
      item.classList.toggle("open", show);
    };
    row.addEventListener("click", () => {
      const opening = detail.hidden;
      for (const other of toggles) other(false);
      toggle(opening);
      if (opening) item.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    toggles.push(toggle);

    road.append(item);
    if (stop.month === open) toggle(true);
  });

  // The far end: the road stops at the card
  const end = document.createElement("li");
  end.className = `road-stop road-end ${onCard ? "is-played" : "is-ahead"}`;
  const endTrack = span("road-track");
  endTrack.append(span("road-way"));
  const endBody = document.createElement("div");
  endBody.className = "road-body";
  const { canvas, start: drawCard } = cardCanvas(card);
  const endHead = span("road-end-label", CARD);
  if (onCard) {
    const open = document.createElement("button");
    open.type = "button";
    open.className = "road-end-open";
    open.append(endHead, canvas);
    open.addEventListener("click", onCard, { once: true });
    endBody.append(open);
  } else {
    endBody.append(endHead, canvas);
  }
  end.append(endTrack, endBody);
  road.append(end);

  // Across a desktop window a mouse wheel moves along the road, unless the page itself has to scroll
  road.addEventListener("wheel", (event) => {
    const across = road.scrollWidth > road.clientWidth;
    const pageScrolls = document.documentElement.scrollHeight > window.innerHeight;
    if (!across || pageScrolls || event.deltaX !== 0) return;
    road.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });

  screen.append(top, road);
  if (opening) {
    const foot = document.createElement("div");
    foot.className = "start-foot";
    const picks = document.createElement("div");
    picks.className = "road-picks";
    picks.setAttribute("role", "group");
    const pickButtons = CHARACTERS.map(({ id, name }) => {
      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "road-pick";
      pick.dataset.character = id;
      pick.setAttribute("aria-pressed", String(id === character));
      const swatch = span("road-pick-swatch");
      swatch.append(drawn("road-pick-figure", CHARACTER_VIEWBOX, characterMarkup(id)));
      pick.append(swatch, span("road-pick-name", name));
      pick.addEventListener("click", () => {
        for (const other of pickButtons) other.setAttribute("aria-pressed", String(other === pick));
        road.querySelector(".road-figure").innerHTML = characterMarkup(id);
        onCharacter(id);
      });
      return pick;
    });
    picks.append(...pickButtons);
    foot.append(picks);
    const play = document.createElement("button");
    play.type = "button";
    play.className = "action";
    play.textContent = PLAY;
    play.addEventListener("click", onPlay, { once: true });
    foot.append(play);
    screen.append(foot);
  }

  // Start where the player is, or at the month that was asked for. The chapter opens from the top
  screen.start = () => {
    drawCard();
    if (opening) {
      window.scrollTo(0, 0);
      road.scrollLeft = 0;
      return;
    }
    const target = road.querySelector(open === null ? '[aria-current="step"]' : `[data-month="${open}"]`);
    target?.scrollIntoView({ block: "center", inline: "center" });
    if (walking) walk(target);
  };

  function walk(target) {
    road.inert = true;
    const from = road.querySelector(`[data-month="${walkFrom}"] .road-track`).getBoundingClientRect();
    const to = target.querySelector(".road-track").getBoundingClientRect();
    const [dx, dy] = [from.left - to.left, from.top + from.height / 2 - (to.top + to.height / 2)];
    const frames = Array.from({ length: WALK_FRAMES + 1 }, (_, i) => {
      const p = i / WALK_FRAMES;
      const hop = Math.abs(Math.sin(p * Math.PI * WALK_HOPS)) * WALK_BOUNCE_PX;
      return { transform: `translate(${dx * (1 - p)}px, ${dy * (1 - p) - hop}px)` };
    });
    const step = target.querySelector(".road-figure").animate(frames, { duration: WALK_MS, easing: "linear" });
    let gone = false;
    let hold = null;
    const leave = () => {
      if (gone) return;
      gone = true;
      clearTimeout(hold);
      step.cancel();
      onWalked();
    };
    hold = setTimeout(leave, WALK_MS + WALK_HOLD_MS);
    screen.addEventListener("click", leave);
  }
  return screen;
}
