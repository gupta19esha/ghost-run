// Home, built to design/Home.html: the chapter, net worth and how it moved last month, the
// three bars, where the player is in their life, and one button.
//
// Every figure is the engine's and every piece of money is text/'s. The bars are the engine's
// values now (getBars); their colours are how they moved over the month just closed (UI.md
// rule 4), with Safety vermilion while the engine says it is in danger.
//
// Beside Safety and Freedom, the figure behind the bar: runway and the committed share,
// read from the engine and worded by text/. Life has no figure behind it, so its space stays
// empty rather than the UI writing words for it (maths doc section 14).
//
// On each bar's track, a thin mark where good is (ruled 30 September 2026, ONBOARDING.md
// section 5): the engine's barMarks. The bar's colour still means how it moved; the mark only
// says where a sensible player would aim. It carries no words.
//
// Top right, "How it works", for every player (ruled 30 September 2026): it reopens the
// landing's text and what each bar measures. In marigold, like "your life so far", so it reads
// as the link it is. The label is the product owner's, approved 30 September 2026. It sits in the top
// row, so it costs Home no height.
//
// Top right, the streak: days in a row with a month closed. Hidden while it is 0, so a new
// or broken streak shows nothing rather than a zero.
//
// Reopened partway through a month, Home comes first (ruled 28 September 2026,
// FIRST-SESSION.md): under the bars, the choices already made this month, each with the
// result line it showed, drawn as the progress timeline draws them. The button then continues
// the month. The words for a continued month and for the list are the product owner's
// (28 September 2026): "Carry on with the month" and "This month so far".

import { direction, arrow } from "./moves.js";
import { hookBlock } from "./hook.js";

const CHAPTER = "Chapter";
const NET_WORTH = "Net worth";
const THIS_MONTH = "this month";
const PLAY = "Play the month";
const HOW_IT_WORKS = "How it works";
// Continuing a month partway through, and the heading over its choices so far: the product
// owner's words (FIRST-SESSION.md section 5)
const CONTINUE = "Carry on with the month";
const SO_FAR = "This month so far";
// The way into the timeline, in marigold so it reads as the link it is (design/Home.html)
const LIFE_SO_FAR = "your life so far";
// The locked Home's two lines are the product owner's copy, not the sheet's
// (design/HomeLocked.html). The month number is the engine's.
const LOCKED = "Come back tomorrow";
const waiting = (month) => `One month a day. Month ${month} is waiting.`;
// The exception, under them: the next month, now, at no cost (ruled 31 October 2026). The
// product owner's words
const NOW = "Play the next month now";

const BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

// The flame and the count, from design/Home.html, in slate: marigold is money only
function streakChip(days) {
  const chip = document.createElement("div");
  chip.className = "streak";
  chip.dataset.streak = String(days);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 13 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M6.5 1C7.5 4 10.5 5 10.5 8.8A4.3 4.3 0 0 1 6.5 15 4.3 4.3 0 0 1 2.5 8.8C2.5 6.4 4 5.4 4.6 3.4c1 .8 1.6 1.6 1.9 2.6C6.9 4.3 6.7 2.6 6.5 1Z" fill="currentColor"/>`;
  const count = document.createElement("span");
  count.textContent = String(days);
  chip.append(svg, count);
  return chip;
}

// chapter: { number in words, title } or null. bars: getBars now. labels: the line beside
// each bar, or null. compared: compareBars over the month just closed. safetyDanger:
// safetyInDanger now. money: text/'s formatter. locked: today's month is played, and the
// button waits for tomorrow. hook: next month's line, shown only while locked. streak: days in a row, from the save. onTimeline: opens the progress timeline, from the line that
// says where the player is. continuing: the month is partly played, and the button carries
// it on. thisMonth: the choices made so far this month, { label, line }, oldest first.
// marks: where each bar's good mark sits, 0 to 100, from the engine. onHowItWorks: opens
// How it works.
export function homeScreen({ onHowItWorks, chapter, bars, labels, compared, marks, safetyDanger, month, age, money, locked, hook, streak, continuing = false, thisMonth = [], onPlay, onTimeline }) {
  const screen = document.createElement("section");
  screen.className = `screen home${continuing ? " continuing" : ""}${locked ? " locked" : ""}`;
  screen.dataset.screen = "home";

  const top = document.createElement("div");
  top.className = "home-top";
  const heading = document.createElement("div");
  heading.className = "home-heading";
  if (chapter) {
    const label = document.createElement("div");
    label.className = "month-label";
    label.textContent = `${CHAPTER} ${chapter.number}`;
    const title = document.createElement("div");
    title.className = "chapter-title";
    title.textContent = chapter.title;
    heading.append(label, title);
  }
  top.append(heading);
  const corner = document.createElement("div");
  corner.className = "home-corner";
  const how = document.createElement("button");
  how.type = "button";
  how.className = "home-how";
  how.textContent = HOW_IT_WORKS;
  how.addEventListener("click", onHowItWorks);
  corner.append(how);
  if (streak > 0) corner.append(streakChip(streak));
  top.append(corner);

  const worth = document.createElement("div");
  worth.className = "home-worth";
  const worthLabel = document.createElement("div");
  worthLabel.className = "month-label";
  worthLabel.textContent = NET_WORTH;
  const figure = document.createElement("div");
  figure.className = "home-net-worth money";
  figure.dataset.value = String(bars.netWorth);
  figure.textContent = money(bars.netWorth);
  worth.append(worthLabel, figure);

  const dir = direction(compared.netWorth.change);
  if (dir !== "flat") {
    const chip = document.createElement("div");
    chip.className = `chip home-chip move-${dir}`;
    const amount = document.createElement("span");
    amount.className = "tabular";
    amount.textContent = `${money(Math.abs(compared.netWorth.change))} ${THIS_MONTH}`;
    chip.append(arrow(dir), amount);
    worth.append(chip);
  }

  const list = document.createElement("div");
  list.className = "home-bars";
  for (const [key, name] of BARS) {
    const danger = key === "safety" && safetyDanger;
    const bar = document.createElement("div");
    bar.className = `home-bar move-${direction(compared[key].change)}${danger ? " danger" : ""}`;
    bar.dataset.bar = key;
    bar.dataset.value = String(bars[key]);
    const head = document.createElement("div");
    head.className = "bar-head";
    const title = document.createElement("span");
    title.className = "bar-name";
    title.textContent = name;
    const figure = document.createElement("span");
    figure.className = "home-bar-figure";
    figure.textContent = labels[key] ?? "";
    head.append(title, figure);
    const track = document.createElement("div");
    track.className = "home-bar-track";
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", name);
    const fill = document.createElement("div");
    fill.className = "home-bar-fill";
    fill.style.width = `${bars[key]}%`;
    track.append(fill);
    if (marks) {
      const mark = document.createElement("div");
      mark.className = "home-bar-mark";
      mark.dataset.mark = String(marks[key]);
      mark.style.left = `${marks[key]}%`;
      track.append(mark);
    }
    bar.append(head, track);
    list.append(bar);
  }

  // The month so far: the chosen card and its result line, as the timeline shows them
  let soFar = null;
  if (thisMonth.length > 0) {
    soFar = document.createElement("div");
    soFar.className = "home-this-month";
    const heading = document.createElement("div");
    heading.className = "month-label";
    heading.textContent = SO_FAR;
    soFar.append(heading);
    for (const choice of thisMonth) {
      const card = document.createElement("div");
      card.className = "chosen";
      card.textContent = choice.label;
      soFar.append(card);
      if (choice.line !== null) {
        const line = document.createElement("p");
        line.className = "timeline-line";
        line.textContent = choice.line;
        soFar.append(line);
      }
    }
  }

  const grow = document.createElement("div");
  grow.className = "grow";

  const foot = document.createElement("div");
  foot.className = "home-foot";
  // Locked, the reason to come back sits above everything else in the foot (UI.md): the
  // screen a returning player sees most
  if (locked && hook) foot.append(hookBlock(hook, "home-hook"));
  // The line that says where the player is opens the life so far (UI.md step 6)
  const where = document.createElement("button");
  where.type = "button";
  where.className = "home-where";
  where.addEventListener("click", onTimeline);
  const line = document.createElement("span");
  const link = document.createElement("span");
  link.className = "home-where-link";
  link.textContent = LIFE_SO_FAR;
  line.append(`Month ${month} · you are ${age} · `, link);
  where.append(document.createElement("div"), line, document.createElement("div"));
  const play = document.createElement("button");
  play.type = "button";
  play.className = "action";
  // Locked once today's month is closed: the button says so, and the line under it names
  // the month that is waiting (design/HomeLocked.html)
  play.disabled = locked;
  play.textContent = locked ? LOCKED : continuing ? CONTINUE : PLAY;
  foot.append(where, play);
  if (locked) {
    const note = document.createElement("p");
    note.className = "home-waiting";
    note.textContent = waiting(month);
    // Smaller and quieter than the button above it, but a real button: playing on is allowed
    // and costs nothing, the streak included (game/save.js)
    const now = document.createElement("button");
    now.type = "button";
    now.className = "home-now";
    now.textContent = NOW;
    now.addEventListener("click", onPlay, { once: true });
    foot.append(note, now);
  } else {
    play.addEventListener("click", onPlay, { once: true });
  }

  screen.append(top, worth, list);
  if (soFar) screen.append(soFar);
  screen.append(grow, foot);
  return screen;
}
