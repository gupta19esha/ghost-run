// The chapter report, built to design/ChapterReport.html and CHAPTER-REPORT.md. It shows once
// the chapter's last month closes, instead of Home. A report, not a verdict: it states what
// happened and names months, not decisions, because the engine does not attribute a month's
// change to a choice (maths doc section 14). The one screen in the product that scrolls.
//
// Every figure is the engine's and every piece of money is text/'s.
//
// Under each month it names, what happened in it: the sheet's month_summary (v25). Under
// "Chapter two", a plain line that it is being written, and the button at the end opens the
// timeline. All three are the product owner's copy (REPORT-COPY.md).
//
// Under the bars, a link back to the chapter card (game/screens/certificate.js). Its words are
// Ghost Run's, not REPORT-COPY.md's.

import { direction, arrow } from "./moves.js";

const CLOSED = "closed";
const NET_WORTH = "Net worth";
const MOVED_MOST = "The months that moved most";
const LIFE_SO_FAR = "See your life so far";
// Chapter 2's opening can be played since sheet v35, so the line no longer says it is being
// written. Placeholders until the product owner writes them (CHAPTER-REPORT.md)
const CHAPTER_TWO = "[PLACEHOLDER report chapter two line. Brief: chapter two, Building, opens now; you are 24. States: none]";
const BEGIN_NEXT = "[PLACEHOLDER report button. Brief: begin chapter two. States: none]";
// The way back to the chapter card, under the bars
const YOUR_CARD = "Your chapter card";

const BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

function label(text) {
  const node = document.createElement("div");
  node.className = "month-label";
  node.textContent = text;
  return node;
}

// The first letter only, for a sentence that starts with a number in words
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// chapter: { number, next } in words. years: the chapter's length in words. age: the engine's.
// bars: getBars now. labels: the lines beside Safety and Freedom. compared: compareBars over
// the chapter. safetyDanger: safetyInDanger now. best, worst: chapterMonths rows. concepts:
// the titles unlocked, in month order, with their count and the rest in words.
// money: text/'s formatMoney. onTimeline: the button at the end. onCard: opens the chapter card.
// onNext: begins the next chapter, when it can be played.
export function reportScreen({
  chapter, years, age, bars, labels, compared, safetyDanger, best, worst, concepts, money, onTimeline, onCard, onNext = null,
}) {
  const screen = document.createElement("section");
  screen.className = "screen report";
  screen.dataset.screen = "report";

  const head = document.createElement("div");
  head.className = "report-head";
  const title = document.createElement("h1");
  title.className = "report-title";
  title.append(`${capitalise(years)} years.`, document.createElement("br"), `You are ${age}.`);
  head.append(label(`Chapter ${chapter.number} ${CLOSED}`), title);

  const worth = document.createElement("div");
  worth.className = "report-worth";
  const figure = document.createElement("div");
  figure.className = "home-net-worth money";
  figure.textContent = money(bars.netWorth);
  worth.append(label(NET_WORTH), figure);
  const dir = direction(compared.netWorth.change);
  if (dir !== "flat") {
    const chip = document.createElement("div");
    chip.className = `chip home-chip move-${dir}`;
    const amount = document.createElement("span");
    amount.className = "tabular";
    amount.textContent = `${money(Math.abs(compared.netWorth.change))} over ${years} years`;
    chip.append(arrow(dir), amount);
    worth.append(chip);
  }

  const list = document.createElement("div");
  list.className = "home-bars report-bars";
  for (const [key, name] of BARS) {
    const danger = key === "safety" && safetyDanger;
    const bar = document.createElement("div");
    bar.className = `home-bar move-${direction(compared[key].change)}${danger ? " danger" : ""}`;
    bar.dataset.bar = key;
    const headRow = document.createElement("div");
    headRow.className = "bar-head";
    const barName = document.createElement("span");
    barName.className = "bar-name";
    barName.textContent = name;
    const barFigure = document.createElement("span");
    barFigure.className = "home-bar-figure";
    barFigure.textContent = labels[key] ?? "";
    headRow.append(barName, barFigure);
    const track = document.createElement("div");
    track.className = "home-bar-track";
    const fill = document.createElement("div");
    fill.className = "home-bar-fill";
    fill.style.width = `${bars[key]}%`;
    track.append(fill);
    bar.append(headRow, track);
    list.append(bar);
  }

  const card = document.createElement("button");
  card.type = "button";
  card.className = "report-card-link";
  card.textContent = YOUR_CARD;
  card.addEventListener("click", onCard, { once: true });

  const moved = document.createElement("div");
  moved.className = "report-section";
  const rows = document.createElement("div");
  rows.className = "report-months";
  for (const row of [best, worst]) {
    const rowDir = direction(row.change);
    const item = document.createElement("div");
    item.className = `report-month move-${rowDir}`;
    item.dataset.month = String(row.month);
    const dot = document.createElement("span");
    dot.className = "report-dot";
    const what = document.createElement("div");
    what.className = "report-month-what";
    const name = document.createElement("div");
    name.className = "report-month-name";
    name.textContent = `Month ${row.month}`;
    what.append(name);
    if (row.summary) {
      const summary = document.createElement("div");
      summary.className = "report-month-summary";
      summary.textContent = row.summary;
      what.append(summary);
    }
    const amount = document.createElement("div");
    amount.className = "report-month-figure";
    amount.textContent = money(row.change);
    item.append(dot, what, amount);
    rows.append(item);
  }
  moved.append(label(MOVED_MOST), rows);

  const learned = document.createElement("div");
  learned.className = "concept report-concepts";
  const learnedHead = document.createElement("div");
  learnedHead.className = "concept-head";
  learnedHead.append(lock(), `You learned ${concepts.count} ${concepts.total === 1 ? "thing" : "things"}`);
  const named = document.createElement("p");
  named.className = "concept-body";
  named.textContent = concepts.rest ? `${concepts.titles.join(", ")}, and ${concepts.rest} more.` : `${concepts.titles.join(", ")}.`;
  learned.append(learnedHead, named);

  const next = document.createElement("div");
  next.className = "report-section report-next";
  const nextLine = document.createElement("p");
  nextLine.className = "report-next-line";
  nextLine.textContent = CHAPTER_TWO;
  next.append(label(`Chapter ${chapter.next}`), nextLine);

  const foot = document.createElement("div");
  foot.className = "report-foot";
  const lifeSoFar = document.createElement("button");
  lifeSoFar.type = "button";
  lifeSoFar.className = "action";
  lifeSoFar.textContent = LIFE_SO_FAR;
  lifeSoFar.addEventListener("click", onTimeline);
  // The next chapter first, once it can be played; the life so far stays, as the quieter button
  if (onNext) {
    const begin = document.createElement("button");
    begin.type = "button";
    begin.className = "action";
    begin.textContent = BEGIN_NEXT;
    begin.addEventListener("click", onNext, { once: true });
    lifeSoFar.className = "close-button";
    foot.append(begin);
  }
  foot.append(lifeSoFar);

  const grow = document.createElement("div");
  grow.className = "grow";
  screen.append(head, worth, list, card, moved);
  if (concepts.total > 0) screen.append(learned);
  screen.append(next, grow, foot);

  // It is read from the top, whatever screen came before it
  screen.start = () => window.scrollTo(0, 0);
  return screen;
}

function lock() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 15 18");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<rect x="1" y="7" width="13" height="10" rx="2" fill="currentColor"/><path d="M4 7V4.5a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="2" fill="none"/>`;
  return svg;
}
