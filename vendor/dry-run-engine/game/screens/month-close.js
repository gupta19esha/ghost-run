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
// money only. At the head's right, "Read more": the card's long version (game/concepts-long.js),
// which opens over the close, in place; its Close comes back to the close where it was. The card
// itself keeps its short text, so it stays a card.
//
// The card is collected by ticking it (ruled 3 November 2026): its tick is the one thing that
// records it. The ideas collected so far, "3 of 20 ideas", are a button beside the month's name
// (screens/ideas-pill.js) that opens the collection over the close, in place too. Ticked, the
// card flies up into it, and the count ticks over with a pulse, to the game's two sounds for
// a choice and a figure rising. The first three times, a line under the count says the full idea
// is in there. Under reduced motion nothing flies and no line shows. A month with more than one
// card shows them one at a time, the next arriving once the one before is ticked. Close does not
// wait for a tick; a card left unticked waits in the collection, where it can be ticked later.
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
import { ideasPill } from "./ideas-pill.js";

const CLOSED = "closed";
const LEARNED = "You learned something";
// The card's tick, before and after
const COLLECT = "Collect";
const COLLECTED = "Collected";
// How long a ticked card holds before the next one comes in
const NEXT_CARD_MS = 650;
// The card's way into its long version
const READ_MORE = "Read more";
// The line under the count, the first three times a card is collected
const HINT = "Each idea is in here, in full.";
// The card's flight into the count, and how long the line under it stays
const FLY_MS = 520;
const HINT_MS = 4200;
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

function readMoreButton(onRead) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "concept-more";
  const word = document.createElement("span");
  word.textContent = READ_MORE;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 10 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  button.append(word, svg);
  button.addEventListener("click", onRead);
  return button;
}

// design/MonthClose.html's card: the lock, the label, Read more, the title with its tick, the body
function conceptCard({ title, body }, onRead, onTick) {
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
  if (onRead) head.append(readMoreButton(onRead));
  const name = document.createElement("div");
  name.className = "concept-title";
  name.textContent = title;
  const text = document.createElement("p");
  text.className = "concept-body";
  text.textContent = body;
  card.append(head, onTick ? titleRow(name, tickButton(() => onTick(card))) : name, text);
  return card;
}

// A copy of the card flies up into the count, shrinking as it goes, then done() runs
function fly(card, target, done) {
  if (reducedMotion() || !target) {
    done();
    return;
  }
  const from = card.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const copy = card.cloneNode(true);
  copy.classList.add("concept-flying");
  copy.setAttribute("aria-hidden", "true");
  Object.assign(copy.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(copy);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.08, to.height / from.height);
  // It lands on time whatever the frames do: a hidden tab or a headless browser can hold them back
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    copy.remove();
    done();
  };
  setTimeout(land, FLY_MS + 40);
  copy.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.7 },
  ], { duration: FLY_MS, easing: "cubic-bezier(0.55, 0, 0.25, 1)" }).finished.then(land, land);
}

// The month's cards, one at a time. concepts: [{ month, title, body }]. onRead(month): opens that
// card's long version. onTick(month): records it, and returns the count with it. flyTo(): the
// count it flies into. collected(count): the card has reached the count, which takes it
function conceptQueue(concepts, { onRead, onTick, flyTo, collected }) {
  const slot = document.createElement("div");
  slot.className = "concept-slot";
  const show = (index) => {
    const concept = concepts[index];
    const card = conceptCard(concept, onRead ? () => onRead(concept.month) : null, (shown) => {
      const count = onTick(concept.month);
      fly(shown, flyTo(), () => collected(count));
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
// longIdea(month, close): the section to show for a card's long version, its Close calling
// close. collection(close, swap): the collection's section, which can swap(section) itself for
// another, such as a long version. sounds: { collect, count }, the game's sounds, or none.
// hintsLeft(): whether the line under the count still shows; onHint(): it has shown once more
export function monthCloseScreen({
  month, compared, safetyDanger, hook, concepts = [], ideas = null, onTick, explanations = null, money, onClose,
  longIdea = null, collection = null, sounds = {}, hintsLeft = () => false, onHint = () => {},
}) {
  const screen = document.createElement("section");
  screen.className = explanations ? "screen month-close explaining" : "screen month-close";
  screen.dataset.screen = "close";

  const head = document.createElement("div");
  head.className = "close-head";
  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = `Month ${month} ${CLOSED}`;
  // The month's name, and beside it the ideas collected, which opens them over the close
  const pill = ideas === null ? null : ideasPill(ideas, () => openSheet(collection), "close-ideas");
  const labelRow = document.createElement("div");
  labelRow.className = "close-label-row";
  labelRow.append(label);
  // The count, and room under it for the line that points at it
  const pillPlace = document.createElement("div");
  pillPlace.className = "close-ideas-place";
  if (pill) {
    pillPlace.append(pill);
    labelRow.append(pillPlace);
  }
  const worth = document.createElement("div");
  worth.className = "net-worth money";
  worth.textContent = money(compared.netWorth.before);
  // A negative in lakhs is too wide for the big size: it takes a size that fits on one line
  if (Math.max(money(compared.netWorth.before).length, money(compared.netWorth.after).length) >= LONG_MONEY) worth.classList.add("is-long");
  head.append(labelRow, worth);

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
  if (concepts.length > 0) {
    screen.append(conceptQueue(concepts, {
      onRead: longIdea ? (cardMonth) => openSheet((close) => longIdea(cardMonth, close)) : null,
      onTick: (cardMonth) => {
        sounds.collect?.();
        return onTick(cardMonth);
      },
      flyTo: () => pill,
      collected: (count) => {
        if (!pill) return;
        pill.setCount(count);
        sounds.count?.();
        if (!reducedMotion() && hintsLeft()) {
          onHint();
          showHint();
        }
      },
    }));
  }

  // The line under the count, pointing up at it, with the count ringed; gone after a while or at
  // the next tap anywhere
  function showHint() {
    const hint = document.createElement("div");
    hint.className = "ideas-hint";
    hint.setAttribute("role", "status");
    hint.textContent = HINT;
    hint.style.setProperty("--to-pill", `${pill.offsetWidth / 2}px`);
    pillPlace.append(hint);
    pill.classList.add("is-hinting");
    let timer = null;
    const gone = () => {
      clearTimeout(timer);
      hint.remove();
      pill.classList.remove("is-hinting");
      document.removeEventListener("pointerdown", gone, true);
    };
    timer = setTimeout(gone, HINT_MS);
    document.addEventListener("pointerdown", gone, true);
  }

  // Over the close, in place: a long version or the collection. Its Close comes back to the close
  // where it was, with focus where it had been
  function openSheet(build) {
    if (!build) return;
    const opener = document.activeElement;
    const sheet = document.createElement("div");
    sheet.className = "close-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    const escape = (event) => {
      if (event.key === "Escape") close();
    };
    const close = () => {
      document.removeEventListener("keydown", escape);
      document.body.classList.remove("sheet-open");
      sheet.remove();
      opener?.focus?.();
    };
    const swap = (section) => {
      sheet.replaceChildren(section);
      sheet.scrollTop = 0;
      section.querySelector(".icon-button")?.focus();
    };
    document.addEventListener("keydown", escape);
    document.body.classList.add("sheet-open");
    screen.append(sheet);
    swap(build(close, swap));
  }
  // The collection ticked a card this close is showing: the close takes the tick and the count
  screen.collected = (cardMonth, count) => {
    if (!concepts.some((c) => c.month === cardMonth)) {
      pill?.setCount(count);
      return;
    }
    const tick = screen.querySelector(".concept-slot .concept-tick");
    if (tick && tick.getAttribute("aria-pressed") !== "true") tick.click();
  };
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
