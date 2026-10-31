// The progress timeline (UI.md step 6; HANDOFF section 4, Progress): the life so far, one dot
// a month, oldest at the top. Tap a month to see what you chose, the result each choice
// showed, and how net worth moved over the month.
//
// No artboard exists. It is built from the pieces the other screens use: the chapter heading
// from Home, "Month N · you are A" from Home, the chosen card from the consequence, the change
// chip from month close. It adds no words of its own; the close button's label is month
// close's "Close".
//
// Each dot is coloured by how net worth moved that month (UI.md rule 4). A month still being
// played has no change yet, so its dot is slate.

import { direction, arrow } from "./moves.js";

const CLOSE = "Close";

export function closeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  return svg;
}

// months: lifeSoFar, oldest first. chapter: { number in words, title } or null.
// money: text/'s formatter. open: a month to show opened, for screenshots only.
export function timelineScreen({ months, chapter, money, open = null, onClose }) {
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

  const list = document.createElement("ol");
  list.className = "timeline-list";
  const items = [];
  for (const record of months) {
    const dir = record.change === null ? "flat" : direction(record.change);
    const item = document.createElement("li");
    item.className = `timeline-month move-${dir}`;
    item.dataset.month = String(record.month);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "timeline-row";
    row.setAttribute("aria-expanded", "false");
    const dot = document.createElement("span");
    dot.className = "timeline-dot";
    const when = document.createElement("span");
    when.className = "timeline-when";
    when.textContent = `Month ${record.month} · you are ${record.age}`;
    row.append(dot, when);
    if (dir !== "flat") {
      const chip = document.createElement("span");
      chip.className = `chip move-${dir}`;
      const amount = document.createElement("span");
      amount.className = "tabular";
      amount.textContent = money(Math.abs(record.change));
      chip.append(arrow(dir), amount);
      row.append(chip);
    }

    const detail = document.createElement("div");
    detail.className = "timeline-detail";
    detail.id = `month-${record.month}`;
    detail.hidden = true;
    row.setAttribute("aria-controls", detail.id);
    for (const choice of record.choices) {
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

    // One month open at a time, so the list stays a timeline and not a wall of text
    const toggle = (show) => {
      detail.hidden = !show;
      row.setAttribute("aria-expanded", String(show));
      item.classList.toggle("open", show);
    };
    row.addEventListener("click", () => {
      const opening = detail.hidden;
      for (const other of items) other(false);
      toggle(opening);
    });
    items.push(toggle);

    item.append(row, detail);
    list.append(item);
    if (record.month === open) toggle(true);
  }

  screen.append(top, list);

  // The newest month is the one the player came from: start with it in view
  screen.start = () => {
    const target = open === null ? list.lastElementChild : list.querySelector(`[data-month="${open}"]`);
    target?.scrollIntoView({ block: "nearest" });
  };
  return screen;
}
