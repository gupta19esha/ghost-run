// The month close, built to design/MonthClose.html: net worth counting to where the month
// left it, the change, and three bars moving from where the month found them.
//
// Above Close, the hook: the artboard's "Next month" label and next month's hook_line from
// the sheet (v23), the product owner's copy. Month 24's close has none: the chapter report
// goes there.
//
// Under the bars, the concept card, when the month carries one (sheet v24): "You learned
// something", the concept's title and its body, the product owner's copy. It comes because
// the month happened, whatever was chosen. Four months carry none, deliberately. The
// artboard draws its lock and label in marigold; they are slate here, because marigold is
// money only. At the head's right, the ideas collected so far, "3 of 20 ideas" (UI.md
// rule 10): a count, not a link, because the close is on its way to Home, which opens them.
//
// The card is collected by ticking it (ruled 3 November 2026): its tick is the one thing that
// records it, and the count goes up as it is ticked. A month with more than one card shows them
// one at a time, the next arriving once the one before is ticked. Close does not wait for a
// tick; a card left unticked waits in the collection, where it can be ticked later.
//
// At the month 1 close only, the one screen that shows all four together says what each one
// measures, a line under each (ruled 30 September 2026, UI.md rule 8). The bars then stack,
// one under another, so each line has the screen's width. The lines are slate and the same
// whichever way the bar moved: they explain the bar, never the month.
//
// Every figure is the engine's (compareBars) and every piece of money is text/'s. The counting
// frames are display only and always end on the engine's figure (UI.md build rule 2).

import { direction, arrow } from "./moves.js";
import { hookBlock } from "./hook.js";

const CLOSED = "closed";
const LEARNED = "You learned something";
// The card's tick, before and after
const COLLECT = "Collect";
const COLLECTED = "Collected";
// How long a ticked card holds before the next one comes in
const NEXT_CARD_MS = 650;
const CLOSE = "Close";
const COUNT_MS = 1200;
const LONG_MONEY = 10;

const BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

// The tick that collects a card: a check in a ring, and its word. Shared with the collection
export function tickButton(onTick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "concept-tick";
  button.setAttribute("aria-pressed", "false");
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  ring.setAttribute("class", "concept-tick-mark");
  ring.setAttribute("viewBox", "0 0 24 24");
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = `<circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const word = document.createElement("span");
  word.textContent = COLLECT;
  button.append(ring, word);
  button.addEventListener("click", () => {
    if (button.getAttribute("aria-pressed") === "true") return;
    button.setAttribute("aria-pressed", "true");
    word.textContent = COLLECTED;
    onTick();
  });
  return button;
}

// The title with the tick beside it, so the tick costs the card no height
export function titleRow(name, tick) {
  const row = document.createElement("div");
  row.className = "concept-title-row";
  row.append(name, tick);
  return row;
}

// design/MonthClose.html's card: the lock, the label, the title with its tick, the body
function conceptCard({ title, body }, ideas, onTick) {
  const card = document.createElement("div");
  card.className = "concept";
  const head = document.createElement("div");
  head.className = "concept-head";
  const lock = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lock.setAttribute("width", "15");
  lock.setAttribute("height", "18");
  lock.setAttribute("viewBox", "0 0 15 18");
  lock.setAttribute("aria-hidden", "true");
  lock.innerHTML = `<rect x="1" y="7" width="13" height="10" rx="2" fill="currentColor"/><path d="M4 7V4.5a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="2" fill="none"/>`;
  const label = document.createElement("span");
  label.textContent = LEARNED;
  head.append(lock, label);
  if (ideas) {
    const count = document.createElement("span");
    count.className = "concept-count";
    count.textContent = ideas;
    head.append(count);
  }
  const name = document.createElement("div");
  name.className = "concept-title";
  name.textContent = title;
  const text = document.createElement("p");
  text.className = "concept-body";
  text.textContent = body;
  card.append(head, onTick ? titleRow(name, tickButton(() => onTick(card))) : name, text);
  return card;
}

// The month's cards, one at a time. concepts: [{ month, title, body }]. ideas: the count before
// any is ticked. onTick(month): records it, and returns the count with it
function conceptQueue(concepts, ideas, onTick) {
  const slot = document.createElement("div");
  slot.className = "concept-slot";
  const show = (index) => {
    const concept = concepts[index];
    const card = conceptCard(concept, ideas, (shown) => {
      ideas = onTick(concept.month);
      const count = shown.querySelector(".concept-count");
      if (count) count.textContent = ideas;
      shown.classList.add("is-collected");
      if (index + 1 >= concepts.length) return;
      const next = () => show(index + 1);
      if (reducedMotion()) next();
      else setTimeout(() => {
        shown.classList.add("is-leaving");
        shown.addEventListener("animationend", next, { once: true });
      }, NEXT_CARD_MS);
    });
    if (index > 0) card.classList.add("is-arriving");
    slot.replaceChildren(card);
  };
  show(0);
  return slot;
}

function explained(text) {
  const line = document.createElement("p");
  line.className = "close-explained";
  line.textContent = text;
  return line;
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// month: the month just closed. compared: compareBars from the engine. safetyDanger: the
// engine's safetyInDanger at the month's end. hook: next month's line, or null. concepts: the
// month's cards, [{ month, title, body }] from the engine's conceptForMonth, none for most of
// the four months without. ideas: the count collected so far, in words, or null. onTick(month):
// collects that card, and returns the count with it. money: text/'s formatter.
// explanations: each one's line, keyed as compared is, at the month 1 close; otherwise null.
export function monthCloseScreen({ month, compared, safetyDanger, hook, concepts = [], ideas = null, onTick, explanations = null, money, onClose }) {
  const screen = document.createElement("section");
  screen.className = explanations ? "screen month-close explaining" : "screen month-close";
  screen.dataset.screen = "close";

  const head = document.createElement("div");
  head.className = "close-head";
  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = `Month ${month} ${CLOSED}`;
  const worth = document.createElement("div");
  worth.className = "net-worth money";
  worth.textContent = money(compared.netWorth.before);
  // A negative in lakhs is too wide for the big size: it takes a size that fits on one line
  if (Math.max(money(compared.netWorth.before).length, money(compared.netWorth.after).length) >= LONG_MONEY) worth.classList.add("is-long");
  head.append(label, worth);

  const dir = direction(compared.netWorth.change);
  if (dir !== "flat") {
    const chip = document.createElement("div");
    chip.className = `chip chip-large move-${dir}`;
    const amount = document.createElement("span");
    amount.className = "tabular";
    amount.textContent = money(Math.abs(compared.netWorth.change));
    chip.append(arrow(dir), amount);
    head.append(chip);
  }
  if (explanations?.netWorth) head.append(explained(explanations.netWorth));

  const bars = document.createElement("div");
  bars.className = "close-bars";
  const fills = [];
  for (const [key, name] of BARS) {
    const { before, after, change } = compared[key];
    const bar = document.createElement("div");
    // UI.md rule 4: Safety in danger is vermilion whatever it did this month
    const danger = key === "safety" && safetyDanger;
    bar.className = `close-bar move-${direction(change)}${danger ? " danger" : ""}`;
    bar.dataset.bar = key;
    const title = document.createElement("span");
    title.className = "close-bar-name";
    title.textContent = name;
    const track = document.createElement("div");
    track.className = "close-bar-track";
    const fill = document.createElement("div");
    fill.className = "close-bar-fill";
    fill.style.width = `${before}%`;
    track.append(fill);
    bar.append(title, track);
    if (explanations?.[key]) bar.append(explained(explanations[key]));
    bars.append(bar);
    fills.push([fill, after]);
  }

  const grow = document.createElement("div");
  grow.className = "grow";

  const foot = document.createElement("div");
  foot.className = "close-foot";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "close-button";
  close.textContent = CLOSE;
  close.addEventListener("click", onClose, { once: true });
  if (hook) foot.append(hookBlock(hook));
  const action = document.createElement("div");
  action.className = "close-action";
  action.append(close);
  foot.append(action);

  screen.append(head, bars);
  if (concepts.length > 0) screen.append(conceptQueue(concepts, ideas, onTick));
  screen.append(grow, foot);

  // Net worth counts from where the month started to where it ended, and the bars move
  screen.start = () => {
    // Reading the layout fixes the starting widths, so setting the new ones transitions
    bars.getBoundingClientRect();
    for (const [fill, after] of fills) fill.style.width = `${after}%`;
    const { before, after } = compared.netWorth;
    if (reducedMotion() || before === after) {
      worth.textContent = money(after);
      return;
    }
    // The clock starts at the first frame: a frame's timestamp can be earlier than the
    // moment this ran, which would make the count start below where it should
    let began = null;
    let done = false;
    const finish = () => {
      done = true;
      worth.textContent = money(after);
    };
    const frame = (now) => {
      if (done) return;
      began ??= now;
      const t = Math.min(Math.max((now - began) / COUNT_MS, 0), 1);
      if (t === 1) {
        finish();
        return;
      }
      worth.textContent = money(before + (after - before) * (1 - (1 - t) ** 3));
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // The count ends on the engine's figure on time, whatever the frames do: a hidden tab
    // or a headless browser can hold them back
    setTimeout(finish, COUNT_MS);
  };
  return screen;
}
