// The progress timeline as a road (UI.md step 6; HANDOFF section 4, Progress): the landing hero's
// road carrying the chapter's months, one stop a month, running down a phone and across a desktop
// window (game/desktop.css). The player's figure stands at the month they have reached.
//
// A played stop carries its month summary, its decision's illustration small, and how net worth
// moved (UI.md rule 4). Tap it to see what you chose and the result each choice showed. An idea the
// month taught sits beside it, and opens that idea. The layoff is marked on the road once it has
// happened, by the sheet's own summary for that month. Stops ahead are dark and say only their
// month, so nothing ahead is told before it comes.
//
// It adds no words of its own; the close button's label is month close's "Close".

import { direction, arrow } from "./moves.js";
import { illustration } from "./illustrations.js";

const CLOSE = "Close";
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

// You, from the hero
const figure = () => drawn("road-figure", "529 224 38 76",
  `<circle cx="548" cy="238" r="12" fill="var(--ink)"/><path d="M531 300v-30a17 17 0 0 1 34 0v30Z" fill="var(--ink)"/>`);
const tree = () => drawn("road-tree", "0 0 40 54",
  `<rect x="17" y="26" width="6" height="28" fill="var(--deep)"/><circle cx="20" cy="20" r="20" fill="var(--deep)"/>`);

// The strip of road this stop stands on
function track(stop, index) {
  const el = span("road-track");
  el.append(span("road-way"));
  const dash = span("road-dash");
  dash.style.setProperty("--i", String(index));
  el.append(dash);
  if (stop.month % TREE_EVERY === 2) el.append(tree());
  if (stop.event) el.append(span("road-barrier"));
  if (stop.here) el.append(figure());
  return el;
}

// stops: game/timeline.js's roadStops. chapter: { number in words, title } or null. money: text/'s
// formatter. open: a month to show opened. onIdea(month): opens that month's idea
export function timelineScreen({ stops, chapter, money, open = null, onIdea, onClose }) {
  const screen = document.createElement("section");
  screen.className = "screen timeline";
  screen.dataset.screen = "timeline";

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
    heading.append(label, title);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button";
  close.setAttribute("aria-label", CLOSE);
  close.append(closeIcon());
  close.addEventListener("click", onClose, { once: true });
  top.append(heading, close);

  const road = document.createElement("ol");
  road.className = "road";
  const toggles = [];
  stops.forEach((stop, index) => {
    const item = document.createElement("li");
    item.className = `road-stop ${stop.played ? "is-played" : "is-ahead"}${stop.event ? " has-event" : ""}`;
    item.dataset.month = String(stop.month);
    if (stop.here) item.setAttribute("aria-current", "step");
    item.append(track(stop, index));

    const body = document.createElement("div");
    body.className = "road-body";
    item.append(body);

    if (!stop.played) {
      body.append(span("road-ahead-month", `Month ${stop.month}`));
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

  // Across a desktop window a mouse wheel moves along the road, unless the page itself has to scroll
  road.addEventListener("wheel", (event) => {
    const across = road.scrollWidth > road.clientWidth;
    const pageScrolls = document.documentElement.scrollHeight > window.innerHeight;
    if (!across || pageScrolls || event.deltaX !== 0) return;
    road.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });

  screen.append(top, road);

  // Start where the player is, or at the month that was asked for
  screen.start = () => {
    const target = road.querySelector(open === null ? '[aria-current="step"]' : `[data-month="${open}"]`);
    target?.scrollIntoView({ block: "center", inline: "center" });
  };
  return screen;
}
