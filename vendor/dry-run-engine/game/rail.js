// The rail: on a desktop window, 900 px wide and up, net worth and the three bars stand in a
// column down the left that stays put while the screens change beside it, instead of scrolling
// with them (game/desktop.css). Below 900 px it is never shown, and every screen keeps its own
// bars as it always has.
//
// main.js says what it holds on each screen (game/main.js, board()). Every figure is the
// engine's and every piece of money is text/'s; the rail only draws them.
//
// UI.md rule 1 holds here too: during a decision the rail shows where the player is and net
// worth (the rule's one exception), and its bars stand down. They come back with the result.
//
// A bar moving moves here as it does on the result screen: rising, the gain grows hatched past
// the old level; falling, the bar shrinks and the loss stays behind it, hatched. Net worth
// counts from one figure to the next, as the month close counts it. Under reduced motion both
// land at once.

import { direction, arrow } from "./screens/moves.js";

const NET_WORTH = "Net worth";
const CHAPTER = "Chapter";
const BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];
const COUNT_MS = 1200;

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

export function createRail() {
  const rail = node("aside", "rail");
  rail.hidden = true;
  rail.setAttribute("aria-label", `${NET_WORTH}, ${BARS.map(([, name]) => name).join(", ")}`);

  const head = node("div", "rail-head");
  const chapterLabel = node("div", "month-label");
  const chapterTitle = node("div", "rail-chapter");
  const where = node("div", "rail-where");
  head.append(chapterLabel, chapterTitle, where);

  const worth = node("div", "rail-worth");
  const worthFigure = node("div", "rail-net-worth money");
  const worthChip = node("div", "chip rail-chip");
  worth.append(node("div", "month-label", NET_WORTH), worthFigure, worthChip);

  const list = node("div", "rail-bars");
  const rows = {};
  for (const [key, name] of BARS) {
    const row = node("div", "rail-bar");
    row.dataset.bar = key;
    const top = node("div", "bar-head");
    const chip = node("span", "chip rail-bar-chip");
    top.append(node("span", "bar-name", name), chip);
    const track = node("div", "rail-track");
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", name);
    const solid = node("div", "rail-solid");
    const change = node("div", "rail-change");
    const mark = node("div", "home-bar-mark");
    track.append(solid, change, mark);
    const figure = node("div", "rail-figure");
    const line = node("p", "rail-explained");
    row.append(top, track, figure, line);
    list.append(row);
    rows[key] = { row, chip, solid, change, mark, figure, line };
  }
  rail.append(head, worth, list);
  // As a band across the top (desktop.css, 900 to 1200 px) the screens below it need its height
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--rail-height", `${rail.offsetHeight}px`);
  }).observe(rail);

  let counting = 0;
  let landing = 0;

  // view, or null to take the rail away:
  //   chapter: { number in words, title } or null. month, age: the engine's.
  //   netWorth: { from, to } and chip: { way, text } or null. money: text/'s formatMoney.
  //   bars: { safety: { from, to, way }, ... }, 0 to 100, the engine's. danger: safetyInDanger.
  //   labels: the line under each bar, or null. marks: where good is on each, or null.
  //   explanations: a line under each bar, keyed as bars are, or null. moved: the key of the bar
  //   a choice moved, which shows its direction as the result screen does, or null.
  //   quiet: a decision is on screen, so the bars stand down (UI.md rule 1).
  function show(view) {
    cancelAnimationFrame(counting);
    clearTimeout(landing);
    document.body.classList.toggle("railed", view !== null);
    rail.hidden = view === null;
    if (!view) return;
    const { money } = view;

    chapterLabel.textContent = view.chapter ? `${CHAPTER} ${view.chapter.number}` : "";
    chapterTitle.textContent = view.chapter?.title ?? "";
    where.textContent = `Month ${view.month} · you are ${view.age}`;

    worthChip.hidden = !view.chip;
    if (view.chip) {
      worthChip.className = `chip rail-chip move-${view.chip.way}`;
      const amount = node("span", "tabular", view.chip.text);
      worthChip.replaceChildren(arrow(view.chip.way), amount);
    }
    countWorth(view.netWorth, money);

    rail.classList.toggle("quiet", Boolean(view.quiet));
    for (const [key] of BARS) {
      const bar = view.bars[key];
      const r = rows[key];
      const danger = key === "safety" && view.danger;
      const moved = view.moved === key && bar.way !== "flat";
      r.row.className = `rail-bar move-${bar.way}${danger ? " danger" : ""}${moved ? " moved" : ""}`;
      r.figure.textContent = view.labels?.[key] ?? "";
      r.line.textContent = view.explanations?.[key] ?? "";
      r.line.hidden = !view.explanations?.[key];
      r.mark.hidden = !view.marks;
      if (view.marks) r.mark.style.left = `${view.marks[key]}%`;
      r.chip.hidden = !moved;
      if (moved) {
        r.chip.className = `chip rail-bar-chip chip-${bar.way}`;
        r.chip.replaceChildren(arrow(bar.way), bar.way);
      }
      moveBar(r, bar);
    }
  }

  function moveBar({ solid, change }, { from, to }) {
    solid.classList.add("still");
    change.classList.add("still");
    solid.style.width = `${from}%`;
    change.style.width = "0%";
    if (from === to || reducedMotion()) {
      solid.style.width = `${to}%`;
      return;
    }
    // Reading the layout fixes the starting widths, so the new ones transition
    solid.getBoundingClientRect();
    solid.classList.remove("still");
    change.classList.remove("still");
    solid.style.width = `${Math.min(from, to)}%`;
    change.style.width = `${Math.abs(to - from)}%`;
  }

  function countWorth({ from, to }, money) {
    if (from === to || reducedMotion()) {
      worthFigure.textContent = money(to);
      return;
    }
    worthFigure.textContent = money(from);
    let began = null;
    const frame = (now) => {
      began ??= now;
      const t = Math.min(Math.max((now - began) / COUNT_MS, 0), 1);
      worthFigure.textContent = money(t === 1 ? to : from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) counting = requestAnimationFrame(frame);
    };
    counting = requestAnimationFrame(frame);
    // It ends on the engine's figure on time, whatever the frames do
    clearTimeout(landing);
    landing = setTimeout(() => {
      cancelAnimationFrame(counting);
      worthFigure.textContent = money(to);
    }, COUNT_MS);
  }

  return { element: rail, show };
}

// The way each bar moved between two getBars readings, as compareBars has it
export function ways(compared) {
  return Object.fromEntries(BARS.map(([key]) => [key, direction(compared[key].change)]));
}
