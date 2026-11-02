// The ideas (UI.md rule 10, ruled 31 October 2026): every concept card the chapter holds, in the
// order CONCEPTS.md set them, as a collection. It opens from Home and from the chapter report.
//
// A collected card is month close's concept card again: its month, its title, its body. One
// still locked shows the lock and the month it waits for, and nothing of what it says. The
// heading is the count, "12 of 20 ideas", the product owner's words; the rest is the sheet's
// and the engine's. No coins, gems or points: the reward is the collection.
//
// No artboard drew it before the ruling; design/Ideas.html draws it now. The close button's
// label is month close's "Close", as the timeline's is. Under "Chapter one", the chapter's name
// is a link to the chapter start (UI.md rule 11).

import { closeIcon } from "./timeline.js";

const CLOSE = "Close";
const CHAPTER = "Chapter";

function lock() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 15 18");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<rect x="1" y="7" width="13" height="10" rx="2" fill="currentColor"/><path d="M4 7V4.5a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="2" fill="none"/>`;
  return svg;
}

// chapter: { number in words, name } or null. ideas: game/ideas.js's ideasSoFar. onChapter:
// opens the chapter start. onClose: back to where it opened from. at: a month whose card to open on
export function ideasScreen({ chapter, ideas, at = null, onChapter = null, onClose }) {
  const screen = document.createElement("section");
  screen.className = "screen ideas";
  screen.dataset.screen = "ideas";

  const top = document.createElement("div");
  top.className = "ideas-top";
  const heading = document.createElement("div");
  if (chapter) {
    const label = document.createElement("div");
    label.className = "month-label";
    label.textContent = `${CHAPTER} ${chapter.number}`;
    heading.append(label);
    if (onChapter && chapter.name) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "home-how ideas-chapter";
      link.textContent = chapter.name;
      link.addEventListener("click", onChapter, { once: true });
      heading.append(link);
    }
  }
  const title = document.createElement("h1");
  title.className = "ideas-title";
  title.textContent = ideas.count;
  heading.append(title);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button";
  close.setAttribute("aria-label", CLOSE);
  close.append(closeIcon());
  close.addEventListener("click", onClose, { once: true });
  top.append(heading, close);

  const list = document.createElement("ol");
  list.className = "ideas-list";
  for (const card of ideas.cards) {
    const item = document.createElement("li");
    item.className = card.collected ? "concept idea" : "idea locked";
    item.dataset.month = String(card.month);
    const head = document.createElement("div");
    head.className = "concept-head";
    if (!card.collected) head.append(lock());
    const when = document.createElement("span");
    when.textContent = `Month ${card.month}`;
    head.append(when);
    item.append(head);
    if (card.collected) {
      const name = document.createElement("div");
      name.className = "concept-title";
      name.textContent = card.title;
      const body = document.createElement("p");
      body.className = "concept-body";
      body.textContent = card.body;
      item.append(name, body);
    }
    list.append(item);
  }

  screen.append(top, list);
  screen.start = () => {
    const card = at === null ? null : list.querySelector(`[data-month="${at}"]`);
    if (card) card.scrollIntoView({ block: "center" });
    else window.scrollTo(0, 0);
  };
  return screen;
}
