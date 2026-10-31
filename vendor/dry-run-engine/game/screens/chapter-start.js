// The chapter start (UI.md rule 11, ruled 31 October 2026): before a chapter's first month, what
// the chapter is, what it teaches and what finishing it gives. It shows once per chapter (the
// save's chaptersOpened) and opens again from the ideas.
//
// The chapter's name, ages and length are the product spec's (game/chapters.js, HANDOFF.md
// section 4), its mark the turn's, unlit. The ideas are the concept cards' titles in month order
// (CONCEPTS.md), each with the lock until its month has closed, under their count. The card is
// the chapter card itself, drawn locked: its places for figures empty, the lock over it, so the
// player sees the thing they will get. "Your chapter card" is the card screen's heading.
//
// It adds no words of its own. The button is Home's "Play the month" on the way into the
// chapter, and month close's "Close" when it is opened again. Nothing on it is timed, so it is
// skipped by pressing the button, which stays pinned in reach while the rest scrolls.

import { mark } from "./chapter-turn.js";
import { cardCanvas } from "./certificate.js";

const CARD = "Your chapter card";
const PLAY = "Play the month";
const CLOSE = "Close";

function lock() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 15 18");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<rect x="1" y="7" width="13" height="10" rx="2" fill="currentColor"/><path d="M4 7V4.5a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="2" fill="none"/>`;
  return svg;
}

function label(text) {
  const node = document.createElement("div");
  node.className = "month-label";
  node.textContent = text;
  return node;
}

// chapter: { number in words, name, ages: { from, to }, months }. ideas: game/ideas.js's
// ideasSoFar for the chapter. card: chapterCard's figures once the chapter is finished, or
// lockedChapterCard's before. again: opened from the ideas, so its button closes it. onDone:
// the button.
export function chapterStartScreen({ chapter, ideas, card, again = false, onDone }) {
  const screen = document.createElement("section");
  screen.className = `screen chapter-start${again ? "" : " intro"}`;
  screen.dataset.screen = "start";
  let n = 0;
  const rise = (node) => {
    node.classList.add("start-rise");
    node.style.setProperty("--n", String(n++));
    return node;
  };

  const head = document.createElement("div");
  head.className = "start-head";
  const title = document.createElement("h1");
  title.className = "start-title";
  title.textContent = chapter.name;
  const span = document.createElement("p");
  span.className = "start-span";
  span.textContent = `${chapter.ages.from} to ${chapter.ages.to} · ${chapter.months} months`;
  head.append(mark(chapter.months, 0), rise(label(`Chapter ${chapter.number}`)), rise(title), rise(span));

  const taught = document.createElement("div");
  taught.className = "start-section";
  const list = document.createElement("ol");
  list.className = "start-ideas";
  for (const idea of ideas.cards) {
    const item = document.createElement("li");
    item.className = `start-idea${idea.collected ? " collected" : ""}`;
    item.dataset.month = String(idea.month);
    if (!idea.collected) item.append(lock());
    const name = document.createElement("span");
    name.textContent = idea.title;
    item.append(name);
    list.append(rise(item));
  }
  taught.append(rise(label(ideas.count)), list);

  const reward = document.createElement("div");
  reward.className = "start-section";
  const { canvas, start: drawCard } = cardCanvas(card);
  reward.append(rise(label(CARD)), rise(canvas));

  const foot = document.createElement("div");
  foot.className = "start-foot";
  const button = document.createElement("button");
  button.type = "button";
  button.className = again ? "close-button" : "action";
  button.textContent = again ? CLOSE : PLAY;
  button.addEventListener("click", onDone, { once: true });
  foot.append(button);

  screen.append(head, taught, reward, foot);
  screen.start = () => {
    window.scrollTo(0, 0);
    drawCard();
  };
  return screen;
}
