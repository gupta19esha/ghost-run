// The ghost screen: a finished life (web/demo/save.json), and the life it would have been with
// one choice changed. Another screen of the same game: Daylight tokens, Baloo 2, the game's card
// shapes, from the game's own stylesheets. Everything shown is computed here, in the browser,
// by the engine in vendor/ through runner/, agent/ and verify/, except the narration: that comes
// from api/narrate.js, and every attempt it returns is checked again here before it is shown.
//
// Before them, once per visitor, an opening that says what this is (#about). It shows on the demo
// life only, the first time its first step would, and the first step links back to it. Whether it
// has shown is kept in localStorage; with no storage it shows on every first visit, nothing worse.
//
// Five steps, one screen each, as the game is one screen at a time. By the address:
//   #about                         The opening: what this is, and one button to begin
//   #run                           1. Your run: the finished life, the chart, the bars
//   #choose                        2. Choose a moment: the two ranked lists, or every month
//   #fork/<index>/<option>         3. The split: the ghost line drawing itself from the split
//   #fork/<index>/<option>/end     4. Where it ended: both runs at month 24, side by side
//   #fork/<index>/<option>/story   5. What happened: the narration, and the verifier's work
// Back and Next sit in the dock at the foot, under the thumb. Moving between steps is a cut, as
// every change of screen in the game is (vendor/dry-run-engine/UI.md, "Motion, as built"): the
// motion is inside a step, and plays the first time the step is reached.

import { readRun, forkView, checkAttempts, costList, surpriseList, surpriseWords, reasons, markedDraft, BAR_KEYS, BAR_NAMES, optionLabel } from "./ghost-model.js";
import { formatMoney } from "../vendor/dry-run-engine/text/render.js";
import { FORMATS, exactMoneyGap, shownMoneyGap } from "../verify/render.js";
import { animate, count, later, tween, reduced, stopAll } from "./motion.js";
import { h, ghostMark, chart, road, hideGhost, drawGhost, legend, track, moveBar, arrive } from "./ui.js";
import { sound, buzz, isMuted, setMuted } from "./sound.js";
import { readSave } from "../vendor/dry-run-engine/game/save.js";

const app = document.getElementById("app");
const money = (n) => formatMoney(n);

// ---------- The life, and its forks ----------

let save = null;
let run = null;
let mine = false;       // the player's own finished chapter, from the game's save, not the demo life
let ranked = null;      // rank summaries, once the worker is done
let progress = null;    // { done, total } while it works
const listeners = new Set();

function startRanking() {
  const worker = new Worker(new URL("./rank-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") progress = { done: data.done, total: data.total };
    else { ranked = data.forks; worker.terminate(); }
    for (const fn of listeners) fn();
  };
  worker.onerror = (e) => { progress = { error: e.message || "The ranking could not run" }; for (const fn of listeners) fn(); };
  worker.postMessage(save);
}

// A fork is run once, and its narration asked for once, however often its steps are visited.
// The demo life's is asked for at the split, so it is usually in by the time the player reaches it.
// A player's own run asks only on reaching the story, as each fork narrated counts against its five
const views = new Map();
const narrations = new Map();
function viewOf(index, option) {
  const key = `${index}/${option}`;
  if (!views.has(key)) views.set(key, forkView(save, index, option));
  return views.get(key);
}
function narrationOf(index, option) {
  const key = `${index}/${option}`;
  if (!narrations.has(key)) narrations.set(key, requestNarration(index, option));
  return narrations.get(key);
}

const go = (hash) => { location.hash = hash; };
// The chart's height for this phone: a short screen gives it less, so the step still fits
const FINISHED_MONTHS = 24;
const ROAD_MAX_WIDTH = 432;
const NOTICE_ARRIVES_MS = 340;
const NOTICE_CLEARANCE = 10;
const chartHeight = () => (innerHeight < 600 ? 104 : innerHeight < 720 ? 146 : 214);

const forkHash = (index, option, part = "") => `#fork/${index}/${option}${part ? `/${part}` : ""}`;

// ---------- The frame every step shares ----------

const STEPS = ["The run", "Choose a moment", "The split", "Where it ended", "What happened"];

// A step: the brand and where you are in the five at the top, the content, and the dock at the
// foot with Back, the sound control and Next. back and next are { label, to }, an address in
// this flow (#...) or a page; a step with no Next carries a hint in its place
function step(n, { back, next = null, hint = null }, ...content) {
  return h("section", { class: "screen ghost-screen step", "data-screen": `step-${n + 1}` },
    h("header", { class: "step-top" },
      h("a", { class: "brand", href: "/" }, ghostMark(20), "Ghost Run"),
      h("ol", { class: "step-ticks", "aria-label": `Step ${n + 1} of ${STEPS.length}` },
        STEPS.map((_, i) => h("li", { class: `step-tick${i <= n ? " is-on" : ""}` })))),
    h("p", { class: "month-label step-label" }, `${n + 1} of ${STEPS.length} · ${n === 0 && mine ? "Your run" : STEPS[n]}`),
    ...content,
    dock(back, next, hint));
}

function dock(back, next, hint) {
  const leave = (to) => () => (to.startsWith("#") ? go(to) : location.assign(to));
  return h("nav", { class: "dock", "aria-label": "Steps" }, h("div", { class: "dock-inner" },
    h("button", { type: "button", class: "dock-back", onclick: leave(back.to) }, `‹ ${back.label}`),
    muteButton(),
    next
      ? h("button", { type: "button", class: "action dock-next", onclick: leave(next.to) }, `${next.label} ›`)
      : h("p", { class: "dock-hint" }, hint)));
}

// The sound control: on until the player turns it off, remembered (web/sound.js)
function muteButton() {
  const button = h("button", { type: "button", class: "mute", "data-silent": "" });
  const draw = () => {
    const off = isMuted();
    button.setAttribute("aria-pressed", String(off));
    button.setAttribute("aria-label", off ? "Sound is off. Turn sound on" : "Sound is on. Turn sound off");
    button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>${off
      ? '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      : '<path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`;
  };
  button.addEventListener("click", () => {
    setMuted(!isMuted());
    draw();
    sound.tap();
  });
  draw();
  return button;
}

// Steps already seen play no motion on a return: the ghost line is simply there
const seen = new Set();

// ---------- The opening ----------

const INTRO_KEY = "ghost-run:intro-seen";
function introSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}
function recordIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // No storage: the opening shows again next time, which costs a tap
  }
}

// What this is, in four lines, and one button. The cards arrive one after another, as the game's do
function introStep() {
  recordIntroSeen();
  const lede = h("p", { class: "intro-lede" }, "A demo player's two years, already played, so you can try the ghost run without playing twenty-four months first.");
  const lines = [
    "Pick any decision they made.",
    "The game replays those two years with the other choice, on the same seed: the same market, the same crash, the same layoff. Only that one choice is different, and if it takes a later choice off the table, the page tells you.",
    "So whatever changes is the choice, not luck.",
  ].map((text) => h("li", { class: "intro-line" }, text));
  const card = h("ol", { class: "card intro-card" }, lines);
  const screen = h("section", { class: "screen ghost-screen step intro", "data-screen": "intro" },
    h("header", { class: "step-top" }, h("a", { class: "brand", href: "/" }, ghostMark(20), "Ghost Run")),
    h("h1", { class: "ghost-title intro-title" }, "This is a finished life."),
    lede,
    card,
    h("nav", { class: "dock", "aria-label": "Begin" }, h("div", { class: "dock-inner" },
      h("button", { type: "button", class: "action dock-next intro-begin", onclick: () => go("#run") }, "Begin ›"))));
  const play = () => {
    arrive(lede, { delay: 80 });
    lines.forEach((line, i) => arrive(line, { delay: 220 + i * 140 }));
  };
  return { screen, play };
}

// ---------- 1. Your run ----------

function runStep() {
  const end = run.end;
  const ticks = h("ol", { class: "ticks", "aria-label": `${run.months.length} of 24 months closed` },
    Array.from({ length: 24 }, (_, i) => h("li", { class: `tick${i < run.months.length ? " is-closed" : ""}` })));
  const worth = h("p", { class: "home-net-worth money tabular" }, money(end.netWorth));
  const gain = shownMoneyGap(run.startNetWorth, end.netWorth);
  const gainText = h("span", { class: "tabular" }, money(Math.abs(gain)));
  const bars = BAR_KEYS.map((k) => h("div", { class: "gbar" }, h("span", { class: "gbar-name" }, BAR_NAMES[k]), track(end[k])));

  const screen = step(0, { back: mine ? { label: "Report", to: "/game/" } : { label: "Home", to: "/" }, next: { label: "Choose a moment", to: "#choose" } },
    mine
      ? h("h1", { class: "ghost-title" }, "Two years. You are 24.")
      : h("h1", { class: "ghost-first" }, "A demo player's two years, finished and loaded, so you can fork a life without playing twenty-four months first."),
    // The way back to the opening
    mine ? null : h("button", { type: "button", class: "intro-again", onclick: () => go("#about") }, "What is this?"),
    ticks,
    h("div", { class: "ghost-worth" },
      h("p", { class: "month-label" }, "Net worth"),
      worth,
      h("span", { class: `chip move-${gain >= 0 ? "up" : "down"}` }, `${gain >= 0 ? "▲" : "▼"} `, gainText, " over two years")),
    // No legend: there is one line, and its figure is the net worth above
    h("div", { class: "card chart-card" }, chart({ real: run.bars, height: chartHeight() })),
    h("div", { class: "gbars" }, bars));

  // It plays in: the ticks light month by month, the figures count up from where the life
  // began, the bars fill
  const play = () => {
    [...ticks.children].forEach((tick, i) => later(120 + i * 28, () => lightTick(tick)));
    // The chapter closing: one chord as the last tick lights, not one for every month
    later(120 + 23 * 28, () => sound.close());
    count(worth, run.startNetWorth, end.netWorth, money, { duration: 700 });
    count(gainText, 0, Math.abs(gain), money, { duration: 700 });
    bars.forEach((bar, i) => moveBar(bar.querySelector(".gbar-track"), 0, end[BAR_KEYS[i]], { delay: 200 + i * 90 }));
  };
  return { screen, play };
}

// A month's tick lighting as the month closes: it takes the closed colour with a short pulse
function lightTick(tick) {
  tick.classList.add("is-closed");
  animate(tick, [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out", fill: "none" });
}

// ---------- 2. Choose a moment ----------

const WAYS = [
  ["cost", "Cost you most", "The choices whose other road ends richest."],
  ["surprise", "Surprises", "Where something moved that money doesn't show."],
  ["months", "Every month", "Every choice you made, month by month. Tap a month to fork it."],
];
let way = "cost";

function chooseStep() {
  const body = h("div", { class: "choose-body" });
  const caption = h("p", { class: "section-lede" });
  const tabs = WAYS.map(([key, title]) => {
    const tab = h("button", { type: "button", class: "seg-tab", role: "tab", onclick: () => { way = key; draw(); } }, title);
    tab.dataset.key = key;
    return tab;
  });

  const choose = (index, option) => go(forkHash(index, option));
  function draw() {
    for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.key === way));
    caption.textContent = WAYS.find(([key]) => key === way)[2];
    if (way === "months") return body.replaceChildren(monthsList(choose));
    if (!ranked) {
      return body.replaceChildren(h("p", { class: "list-wait" }, ghostMark(18),
        progress?.error ? `The ranking could not run: ${progress.error}` :
          progress ? `Living every other life: ${progress.done} of ${progress.total}` : "Living every other life…"));
    }
    const items = way === "cost" ? costList(ranked) : surpriseList(ranked);
    body.replaceChildren(h("ol", { class: "list" }, items.map((f) => h("li", {},
      h("button", { type: "button", class: "option list-item", "data-choose": "", onclick: () => choose(f.monthIndex, f.option) },
        h("span", { class: "list-month" }, `Month ${f.month}`),
        h("span", { class: "list-what" }, optionLabel(f.option)),
        h("span", { class: "list-instead" }, `instead of “${optionLabel(f.real)}”`),
        h("span", { class: "list-why" }, way === "cost"
          ? `The ghost ends ${money(f.shownGap)} richer`
          : surpriseWords(f.reason, f.features.end)))))));
  }
  const redraw = () => { if (way !== "months" && document.body.contains(body)) draw(); };
  listeners.add(redraw);
  draw();

  const screen = step(1, { back: { label: "Your run", to: "#run" }, hint: "Tap a choice to fork it" },
    h("h1", { class: "ghost-title" }, "Pick a choice to change"),
    h("div", { class: "seg", role: "tablist" }, tabs),
    caption,
    body);
  return { screen, cleanup: () => listeners.delete(redraw) };
}

// Every month, each one opening to what you chose and what else was on the table
function monthsList(choose) {
  return h("ol", { class: "months" }, run.months.map((m) => {
    const detail = h("div", { class: "month-detail", hidden: true }, m.choices.map((c) => h("div", { class: "month-choice" },
      h("p", { class: "month-situation" }, c.situation),
      h("div", { class: "chosen" }, c.chosen.label),
      h("p", { class: "or-label" }, "Fork it:"),
      h("div", { class: "options" }, c.alternatives.map((a) =>
        h("button", { type: "button", class: "option", "data-choose": "", onclick: () => choose(c.index, a.option) }, a.label))))));
    const row = h("button", { type: "button", class: "month-row", "aria-expanded": "false",
      onclick: () => {
        const open = detail.hidden;
        detail.hidden = !open;
        row.setAttribute("aria-expanded", String(open));
      } },
      h("span", { class: "month-num is-closed" }, String(m.month)),
      h("span", { class: "month-text" },
        h("span", { class: "month-summary" }, m.summary ?? `Month ${m.month}`),
        h("span", { class: "month-chose" }, m.choices.map((c) => c.chosen.label).join(" · "))),
      h("span", { class: "month-worth tabular" }, money(run.bars.find((b) => b.month === m.month).netWorth)));
    return h("li", { class: "month" }, row, detail);
  }));
}

// ---------- 3. The split ----------

function splitStep(index, option) {
  const view = viewOf(index, option);
  const { result } = view;
  if (!mine) narrationOf(index, option);
  const nw = view.compare[0];
  // Drawn at the card's own width, so its labels stay the size they are written at
  const forkRoad = road({ ...view.road, character: save.character, height: chartHeight(), width: Math.min(innerWidth - 48, ROAD_MAX_WIDTH) });
  const chartLegend = legend(nw.real, nw.ghost);
  const legendGhost = chartLegend.querySelectorAll("b")[1];
  const notices = new Map(view.notices.map((n) => [n.month,
    h("p", { class: "notice" }, h("i", { class: "notice-mark", "aria-hidden": "true" }), n.text)]));

  const screen = step(2, { back: { label: "Choose", to: "#choose" }, next: { label: "Where it ended", to: forkHash(index, option, "end") } },
    h("h1", { class: "ghost-title" }, `What if, month ${view.month}`),
    h("div", { class: "pair" },
      h("p", { class: "pair-label" }, "You chose"),
      h("div", { class: "chosen" }, view.real.label),
      h("p", { class: "pair-label is-ghost" }, ghostMark(16), "The ghost chose"),
      h("div", { class: "ghost-card" }, view.ghost.label)),
    h("div", { class: "card chart-card road-card" }, forkRoad, chartLegend),
    notices.size > 0 && h("div", { class: "notices" }, [...notices.values()]));

  // The moment the feature exists for: the ghost's road draws itself from the split month, the
  // legend's ghost figure keeping pace, each substitution notice arriving as the road passes its
  // month. A tap lands on the end of it
  const play = () => {
    hideGhost(forkRoad);
    legendGhost.textContent = money(nw.real);
    for (const el of notices.values()) el.style.opacity = reduced() ? "" : "0";
    later(300, () => drawGhost(forkRoad, {
      progress: (p) => { legendGhost.textContent = money(nw.real + (nw.ghost - nw.real) * p); },
      onRing: (ring) => { const el = notices.get(ring.month); if (el) arrive(el, { distance: 8 }); },
      done: () => {
        sound.ghost();
        buzz([8, 60, 8]);
        // A notice whose month the road never passed still arrives
        for (const el of notices.values()) if (el.style.opacity === "0") arrive(el, { distance: 8 });
        // On a short phone the last notice lands under the dock: bring it clear, once it has arrived
        later(NOTICE_ARRIVES_MS, () => {
          const last = [...notices.values()].at(-1);
          const dock = document.querySelector(".dock");
          if (!last || !dock) return;
          const over = last.getBoundingClientRect().bottom - dock.getBoundingClientRect().top + NOTICE_CLEARANCE;
          if (over > 0) window.scrollBy({ top: over, behavior: reduced() ? "auto" : "smooth" });
        });
      },
    }));
  };
  return { screen, play };
}

// ---------- 4. Where it ended ----------

function endStep(index, option) {
  const view = viewOf(index, option);
  const nw = view.compare[0];
  const realFigure = h("p", { class: "compare-figure money tabular" }, money(nw.real));
  const ghostFigure = h("p", { class: "compare-figure ghost-figure tabular" }, money(nw.ghost));
  const gapLine = h("span", { class: "tabular" }, nw.gap);
  const rows = view.compare.slice(1).map((c) => {
    const label = h("span", { class: "gbar-gap tabular" }, c.gap === "level" ? "Level" : `Ghost ${c.gap}`);
    const realTrack = track(c.real);
    const ghostTrack = track(c.ghost, true);
    return { c, label, realTrack, ghostTrack,
      el: h("div", { class: "gbar" }, h("div", { class: "gbar-head" }, h("span", { class: "gbar-name" }, c.name), label), realTrack, ghostTrack) };
  });

  const screen = step(3, { back: { label: "The split", to: forkHash(index, option) }, next: { label: "What happened", to: forkHash(index, option, "story") } },
    h("h1", { class: "ghost-title" }, `Month ${view.endMonth}`),
    h("div", { class: "compare-worth" },
      h("div", {}, h("p", { class: "month-label" }, "You"), realFigure),
      h("div", { class: "is-ghost" }, h("p", { class: "month-label" }, "Ghost"), ghostFigure)),
    h("p", { class: "compare-gap" }, "The ghost has ", gapLine, "."),
    h("div", { class: "gbar-key", "aria-hidden": "true" },
      h("span", {}, h("i", { class: "key-real" }), "You"),
      h("span", {}, h("i", { class: "key-ghost" }), "The ghost")),
    h("div", { class: "gbars" }, rows.map((r) => r.el)));

  // Both figures count up together and part, the real bars fill, then each ghost bar moves from
  // the real value to its own: a rise overshoots and settles, a fall is flatter and quicker
  const play = () => {
    count(realFigure, 0, nw.real, money, { duration: 700 });
    count(ghostFigure, 0, nw.ghost, money, { duration: 700 });
    tween({ duration: 700, update: (p) => { gapLine.textContent = exactMoneyGap(nw.real, nw.real + (nw.ghost - nw.real) * p); } });
    rows.forEach((r, i) => {
      moveBar(r.realTrack, 0, r.c.real, { delay: 200 + i * 80 });
      r.ghostTrack.style.opacity = reduced() ? "" : "0";
      if (!reduced()) r.label.textContent = "Level";
      later(700 + i * 140, () => {
        r.ghostTrack.style.opacity = "";
        animate(r.ghostTrack, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
        moveBar(r.ghostTrack, r.c.real, r.c.ghost, { onStart: (rise) => (rise ? sound.rise : sound.fall)() });
        const gap = r.c.ghost - r.c.real;
        tween({ duration: gap >= 0 ? 500 : 360, update: (p) => {
          const words = p === 1 ? r.c.gap : FORMATS[`${r.c.key}_gap`](gap * p);
          r.label.textContent = words === "level" ? "Level" : `Ghost ${words}`;
        } });
      });
    });
  };
  return { screen, play };
}

// ---------- 5. What happened ----------

function storyStep(index, option) {
  const view = viewOf(index, option);
  // The narration: asked of api/narrate.js, then every attempt it made checked here by verify()
  const card = h("div", { class: "card narration" },
    h("p", { class: "month-label" }, "Narration"),
    h("p", { class: "narration-wait" }, ghostMark(18), mine ? "Narrating your fork, and checking every attempt. This can take a while…" : "Fetching the narration, and checking every attempt…"));
  const screen = step(4, { back: { label: "Month 24", to: forkHash(index, option, "end") }, next: { label: "Fork another", to: "#choose" } },
    h("h1", { class: "ghost-title" }, "What happened"),
    h("p", { class: "section-lede" }, `You chose “${view.real.label}”. The ghost chose “${view.ghost.label}”.`),
    card,
    h("p", { class: "ghost-foot" }, "Educational simulation. Not investment advice."));
  let gone = false;
  narrationOf(index, option)
    .then((served) => {
      if (gone) return;
      card.replaceChildren(...narrationCard(view, checkAttempts(view.result, served.attempts), served.note));
    })
    .catch((error) => {
      if (gone) return;
      card.replaceChildren(
        h("p", { class: "month-label" }, "Narration"),
        h("p", { class: "narration-text is-missing" }, error.message));
    });
  return { screen, cleanup: () => { gone = true; } };
}

// Asks the server to narrate a fork: { attempts, note }, every attempt it made, in order, and on a
// player's own run, why it is the plain narration when a limit was the reason
async function requestNarration(index, option) {
  let response;
  try {
    response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: save.seed, choices: save.choices, monthIndex: index, option }),
    });
  } catch {
    throw new Error("The narrator could not be reached.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ? `${data.error}.` : `The narrator answered ${response.status}.`);
  return { attempts: data.attempts, note: data.note ?? null };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function toggleFor(target, show, hide) {
  const button = h("button", { type: "button", class: "text-toggle", "aria-expanded": "false",
    onclick: () => {
      target.hidden = !target.hidden;
      button.setAttribute("aria-expanded", String(!target.hidden));
      button.textContent = target.hidden ? show : hide;
    } }, show);
  return button;
}

// The card's contents once the attempts are in and checked
function narrationCard(view, checked, note = null) {
  const { accepted, rejected, attempts, plain } = checked;
  // Not counted among what the narrator did, because no narrator did it
  if (!plain) record(view, checked);

  // The accepted narration. A same-money fork's first sentence is its headline
  let lead = null;
  let body = checked.rendered;
  if (checked.rendered && view.sameMoney) {
    const cut = checked.rendered.indexOf(". ") + 1;
    lead = checked.rendered.slice(0, cut);
    body = checked.rendered.slice(cut + 1);
  }

  const figures = accepted && h("ul", { class: "figures", hidden: true }, accepted.figures.map((f) =>
    h("li", {}, h("code", {}, `{${f.token}}`), " ", h("span", {}, f.text))));

  const rejectedList = rejected.map((a) => {
    const draft = h("p", { class: "draft", hidden: true },
      markedDraft(a.narration, a.failures).map((part) => (part.mark ? h("mark", {}, part.text) : part.text)));
    return h("li", { class: "attempt" },
      h("p", { class: "attempt-head" }, h("b", {}, "✕"), ` Attempt ${a.number} · rejected`,
        h("span", { class: "attempt-rules" }, a.failures.map((f) => f.rule).filter((r, i, all) => all.indexOf(r) === i).join(", "))),
      h("ul", { class: "reasons" }, reasons(a).map((r) => h("li", {}, r.text))),
      toggleFor(draft, "Show the draft", "Hide the draft"),
      draft);
  });

  return [
    h("p", { class: "month-label" }, plain ? "Built from the figures" : "Narration"),
    lead && h("p", { class: "narration-lead" }, lead),
    checked.rendered
      ? h("p", { class: "narration-text" }, body)
      : h("p", { class: "narration-text is-missing" }, `No attempt passed in ${plural(attempts.length, "try", "tries")}, so there is nothing to show.`),
    plain && accepted && h("div", { class: "verdict is-ok" },
      h("p", { class: "verdict-line" }, h("b", {}, "✓"), ` ${plural(accepted.figures.length, "figure", "figures")} checked against the simulation.`),
      note && h("p", { class: "verdict-note" }, note),
      h("p", { class: "verdict-note" }, "No model wrote this. It is a fixed template filled with this fork's figures, and verify() checked each of them in this browser."),
      figures && toggleFor(figures, "Show the figures", "Hide the figures"),
      figures),
    !(plain && accepted) && h("div", { class: `verdict ${accepted ? "is-ok" : "is-bad"}` },
      accepted
        ? h("p", { class: "verdict-line" }, h("b", {}, "✓"),
          ` Accepted on attempt ${accepted.number} of ${attempts.length}. ${plural(accepted.figures.length, "figure", "figures")} checked against the simulation.`)
        : h("p", { class: "verdict-line" }, h("b", {}, "✕"), ` None of ${plural(attempts.length, "attempt", "attempts")} passed.`),
      h("p", { class: `rejected-count${rejected.length ? " has-some" : ""}` },
        rejected.length ? `${plural(rejected.length, "attempt", "attempts")} rejected` : "No attempts rejected on this fork"),
      rejectedList.length > 0 && h("ol", { class: "attempts" }, rejectedList),
      !checked.agrees && h("p", { class: "verdict-warning" }, "This browser's check disagrees with the server's on at least one attempt. The browser's verdict is shown."),
      h("p", { class: "verdict-note" },
        "A model wrote this narration. Every attempt it made is checked again by verify() in this browser, against this fork, and kept, passed or not. ",
        "A rejected attempt's reasons went back to the model before it tried again."),
      h("p", { class: "verdict-tally" }, tallyLine()),
      figures && toggleFor(figures, "Show the figures", "Hide the figures"),
      figures),
  ].filter(Boolean);
}

// ---------- The attempt record ----------

// Every attempt on every fork opened this session, kept by fork so reopening one does not count
// it twice
const attemptLog = new Map();
function record(view, checked) {
  attemptLog.set(`${view.monthIndex}:${view.ghost.option}`, checked.attempts.map((a) => ({ number: a.number, ok: a.ok, rules: a.failures.map((f) => f.rule) })));
}
function tallyLine() {
  const all = [...attemptLog.values()].flat();
  const rejected = all.filter((a) => !a.ok).length;
  return `This session: ${attemptLog.size} ${attemptLog.size === 1 ? "fork" : "forks"} narrated, ${all.length} ${all.length === 1 ? "attempt" : "attempts"} checked, ${rejected} rejected.`;
}

// ---------- Routing ----------

let current = null;
let chooseScroll = 0;
function route() {
  // The first arrival at the demo life opens on what this is, once per visitor
  const first = !location.hash || location.hash === "#run";
  const hash = location.hash === "#about" || (first && !mine && !introSeen()) ? "#about" : location.hash || "#run";
  const fork = hash.match(/^#fork\/(\d+)\/([A-Z0-9]+-[A-Z])(?:\/(end|story))?$/);
  const key = fork ? fork[0] : hash === "#choose" ? "#choose" : hash === "#about" && !mine ? "#about" : "#run";
  if (current?.key === "#choose") chooseScroll = window.scrollY;
  current?.cleanup?.();
  stopAll();
  let next;
  try {
    if (fork) {
      const [index, option] = [Number(fork[1]), fork[2]];
      next = fork[3] === "end" ? endStep(index, option) : fork[3] === "story" ? storyStep(index, option) : splitStep(index, option);
    } else {
      next = key === "#choose" ? chooseStep() : key === "#about" ? introStep() : runStep();
    }
  } catch (error) {
    next = { screen: step(2, { back: { label: "Choose", to: "#choose" }, hint: "" },
      h("p", { class: "ghost-error" }, `That fork cannot be run: ${error.message}`)) };
  }
  // A cut, as in the game
  app.replaceChildren(next.screen);
  window.scrollTo(0, key === "#choose" ? chooseScroll : 0);
  current = { key, ...next };
  if (!seen.has(key)) {
    seen.add(key);
    next.play?.();
  }
}

// Every button taps; choosing a fork confirms, with a short buzz where the device can
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("button");
  if (!button || button.hasAttribute("data-silent")) return;
  if (button.hasAttribute("data-choose")) {
    sound.confirm();
    buzz(12);
  } else {
    sound.tap();
  }
});

async function main() {
  try {
    const own = new URLSearchParams(location.search).get("run") === "mine" ? readSave() : null;
    if (own?.closed >= FINISHED_MONTHS) {
      try {
        run = readRun(own);
        save = own;
        mine = true;
      } catch {
        run = null;
      }
    }
    if (!mine) {
      save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
      run = readRun(save);
    }
  } catch (error) {
    app.replaceChildren(h("p", { class: "ghost-error" }, `The demo life could not load: ${error.message}`));
    return;
  }
  window.addEventListener("hashchange", route);
  route();
  startRanking();
}

main();
