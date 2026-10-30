// The playable Chapter 1, UI.md version 2. Step 5: save and resume, one session per day.
// The session loop is the month card, each of the month's decisions with its consequence, the
// month run by the engine, any callbacks that land, then the month close. Close goes Home,
// and Home plays the next month, once a day. The first month starts straight from the
// landing screen. Reopening continues where the player was (game/save.js).
//
// Look, copy and illustration come from design/, which is the source of truth.

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getDecision, conceptForMonth, chapterMonths, chapterComplete,
  monthSummary, getBars, compareBars, barMarks,
  safetyInDanger, salaryThisMonth, tokenValues,
} from "../engine/index.js";
import { renderText, formatMoney, formatCount } from "../text/render.js";
import {
  PRODUCT_NAME, SEED, TEST_TOOLS, CONSEQUENCE_MS, CONSEQUENCE_EXPLAINED_MS, MONTH_CARD_MS, CALLBACK_MS, CHAPTER_TURN_MS,
} from "./config.js";
import { landingScreen } from "./screens/landing.js";
import { monthCardScreen } from "./screens/month-card.js";
import { decisionScreen } from "./screens/decision.js";
import { consequenceScreen, barMoved } from "./screens/consequence.js";
import { BAR_LINES } from "./screens/bar-lines.js";
import { callbackScreen } from "./screens/callback.js";
import { monthCloseScreen } from "./screens/month-close.js";
import { homeScreen } from "./screens/home.js";
import { timelineScreen } from "./screens/timeline.js";
import { howItWorksScreen } from "./screens/how-it-works.js";
import { reportScreen } from "./screens/report.js";
import { chapterTurnScreen } from "./screens/chapter-turn.js";
import { certificateScreen } from "./screens/certificate.js";
import { chapterCard } from "./certificate.js";
import { barLabels } from "./labels.js";
import { lifeSoFar } from "./timeline.js";
import {
  newSave, readSave, writeSave, dropSave, replay, playedToday, recordClose, currentStreak, explainedAlready, recordExplained,
  jumpSave, introSeen, recordIntroSeen,
} from "./save.js";
import { installTestingTools } from "./testing.js";
import { BALANCED_CHOICES } from "./balanced-path.js";

const app = document.getElementById("app");
document.title = PRODUCT_NAME;

let state = null;
// What the player did, kept in localStorage after every choice and every close
let save = null;
// The bars as the month found them, for the month close to move from
let monthStart = null;
// The month Home last showed the change for, so coming back from the timeline shows it again
let homeLastMonth = null;
// Whether Home is showing a month partly played, so the timeline's Close returns to the same Home
let homeContinuing = false;

// Screenshots only (scripts/screenshot_ui.py): play= lists the choices to make, in order,
// separated by commas, and stop= names the screen to hold once they are made: home, month,
// decision, consequence, callback, close, timeline, how, turn, card or report. With stop=timeline, month= opens that
// month. Everything in between is tapped through. Nothing
// in play uses it; with no query string it does nothing. It always starts a new run from the
// landing screen, and plays past the day's limit unless stop=home.
const query = new URLSearchParams(location.search);
const script = {
  play: (query.get("play") || "").split(",").filter(Boolean),
  stop: query.get("stop"),
  active: query.has("play") || query.has("stop") || query.has("begin"),
};
const holding = (screen) => script.stop === screen && script.play.length === 0;

export function show(screen) {
  app.replaceChildren(screen);
  testing?.shown(screen);
  screen.start?.();
}

// Testing tools, tester builds only (TEST_TOOLS): the corner control and its panel
const testing = TEST_TOOLS
  ? installTestingTools({ currentScreen: () => app.firstElementChild, onRestart: restart, onJump: jumpTo })
  : null;

function begin() {
  // UI.md: everyone starts at 22, so there is nothing to choose here. The run is the
  // engine's opening position.
  save = newSave({ seed: SEED });
  writeSave(save);
  state = createState(SEED);
  startMonth();
}

function startMonth() {
  monthStart = getBars(state);
  showMonthCard();
}

// Continuing a month the player left partway through: the month card again, so they re-enter
// the month as they first entered it, then the next decision, or the month's run when every
// decision is made. monthStart stays as the month found it, from the save's replay.
function continueMonth() {
  showMonthCard();
}

function showMonthCard() {
  const salary = salaryThisMonth(state);
  show(monthCardScreen({
    month: state.month,
    age: state.age,
    salary: salary > 0 ? formatMoney(salary) : null,
    holdMs: MONTH_CARD_MS,
    hold: holding("month"),
    onDone: nextDecision,
  }));
}

// The month's decisions one at a time, in sheet order. When none are left, the month runs.
function nextDecision() {
  const [decision] = decisionsForMonth(state);
  if (!decision) {
    runMonth();
    return;
  }
  const situation = renderText(decision.situation_text, tokenValues(state, { decisionId: decision.decision_id, field: "situation_text" }));
  const screen = decisionScreen({
    decision,
    month: state.month,
    situation,
    netWorth: formatMoney(getBars(state).netWorth),
    onChoose: (optionId) => choose(decision, optionId),
  });
  show(screen);
  const next = script.play.shift();
  if (next) screen.querySelector(`[data-option-id="${CSS.escape(next)}"]`)?.click();
}

function choose(decision, optionId) {
  const result = applyDecision(state, decision.decision_id, optionId);
  state = result.state;
  save.choices.push(optionId);
  writeSave(save);
  const option = decision.options[optionId];
  // Section 10.1: an immediate text with nothing left is skipped, so line can be null
  const line = renderText(option.immediate_text, tokenValues(state, { decisionId: decision.decision_id, optionId, field: "immediate_text" }));
  const bars = result.effects.find((e) => e.type === "bars");
  // The first time a bar moves on a result, its line shows and the result holds longer
  // (ruled 30 September 2026). Recorded only once it has a line to show
  const move = barMoved(bars);
  const explanation = move && !explainedAlready(save, move.key) ? BAR_LINES[move.key] : null;
  if (explanation) {
    recordExplained(save, move.key);
    writeSave(save);
  }
  show(consequenceScreen({
    decisionId: decision.decision_id,
    option,
    line,
    bars,
    explanation,
    safetyDanger: safetyInDanger(state),
    holdMs: explanation ? CONSEQUENCE_EXPLAINED_MS : CONSEQUENCE_MS,
    hold: holding("consequence"),
    onDone: nextDecision,
  }));
}

// The engine runs the month. A callback lands in it only when its text has something left
// (rule 28), so every "callback" event has a text to show; renderText is still checked.
function runMonth() {
  const closed = state.month;
  const { state: next, events } = advanceMonth(state);
  state = next;
  const texts = events
    .filter((e) => e.type === "callback")
    .map((e) => {
      const option = getDecision(e.decision_id).options[e.opened_by];
      return renderText(option.deferred_text, tokenValues(state, { decisionId: e.decision_id, optionId: e.opened_by, field: "deferred_text" }));
    })
    .filter((text) => text !== null);
  const monthEnd = events.find((e) => e.type === "bars");
  showCallbacks(texts, () => closeMonth(closed, monthEnd));
}

function showCallbacks(texts, then) {
  if (texts.length === 0) {
    then();
    return;
  }
  const [text, ...rest] = texts;
  show(callbackScreen({
    text,
    holdMs: CALLBACK_MS,
    hold: holding("callback"),
    onDone: () => showCallbacks(rest, then),
  }));
}

function closeMonth(closed, monthEnd) {
  const screen = monthCloseScreen({
    month: closed,
    compared: compareBars(monthStart, monthEnd),
    safetyDanger: safetyInDanger(state),
    hook: nextHook(),
    concept: conceptForMonth(closed),
    // The month 1 close says what all four measure (ruled 30 September 2026)
    explanations: closed === 1 ? BAR_LINES : null,
    money: formatMoney,
    onClose: () => {
      recordClose(save, closed);
      writeSave(save);
      // The chapter's last month: the turn of the chapter, then its card, then the report
      if (chapterComplete(state)) closeChapter();
      else goHome(compareBars(monthStart, monthEnd));
    },
  });
  show(screen);
  if (script.active && !holding("close")) screen.querySelector(".close-button").click();
}

// The hook for the month that is waiting: the sheet's hook_line on its first decision (v22).
// After month 24 there are no decisions, so no hook: the chapter report goes there.
function nextHook() {
  const [first] = decisionsForMonth(state);
  return first?.hook_line ?? null;
}

// The chapter closing, as it happens: the turn of the chapter, then the chapter card, then the
// report. It plays once, as the last month closes; after that the report stands where Home
// would, and opens the card again. A screenshot script passes straight through unless it stops
// on one of them.
function closeChapter() {
  const card = chapterCard(state, save);
  const toCard = () => {
    if (script.active && !holding("card")) showReport();
    else showCard(card, CARD_TO_REPORT, showReport);
  };
  if (script.active && !holding("turn")) {
    toCard();
    return;
  }
  show(chapterTurnScreen({
    way: "close",
    chapter: { number: card.chapter.number, title: card.chapter.title, months: card.shape.length - 1 },
    ages: card.ages,
    holdMs: CHAPTER_TURN_MS,
    hold: holding("turn"),
    onDone: toCard,
  }));
}

// The button under the card, after the turn and from the report
const CARD_TO_REPORT = "See the chapter report";
const CARD_BACK = "Back to the report";

function showCard(card, back, onBack) {
  show(certificateScreen({ card, back, onBack }));
}

// The chapter report (CHAPTER-REPORT.md): the whole chapter, from the engine. The months that
// moved most are the highest and lowest of chapterMonths; the concepts are every card the
// chapter's months unlocked, whatever was chosen.
function showReport() {
  const months = chapterMonths(state);
  const named = (row) => ({ ...row, summary: monthSummary(row.month) });
  const best = named(months.reduce((a, b) => (b.change > a.change ? b : a)));
  const worst = named(months.reduce((a, b) => (b.change < a.change ? b : a)));
  const titles = months.map((m) => conceptForMonth(m.month)).filter(Boolean).map((c) => c.title);
  const listed = titles.slice(0, REPORT_CONCEPTS_LISTED);
  show(reportScreen({
    chapter: { number: formatCount(1), next: formatCount(2) },
    years: formatCount(months.length / 12),
    age: state.age,
    bars: getBars(state),
    labels: barLabels(state),
    compared: compareBars(getBars(createState(save.seed)), getBars(state)),
    safetyDanger: safetyInDanger(state),
    best,
    worst,
    concepts: {
      total: titles.length,
      count: formatCount(titles.length),
      titles: listed,
      rest: titles.length > listed.length ? formatCount(titles.length - listed.length) : null,
    },
    money: formatMoney,
    onTimeline: () => openTimeline(showReport),
    onCard: () => showCard(chapterCard(state, save), CARD_BACK, showReport),
  }));
}

// The report names this many concepts, then counts the rest (design/ChapterReport.html)
const REPORT_CONCEPTS_LISTED = 8;

// Home: the engine's bars as they stand, coloured by the month just closed. Its button waits
// for tomorrow once a month has been closed today (UI.md step 5). A screenshot script plays
// past it, unless the screen it is there to capture is Home itself.
function goHome(lastMonth, continuing = false) {
  // Once the chapter's last month has closed, the chapter report stands where Home would
  if (chapterComplete(state)) {
    showReport();
    return;
  }
  homeLastMonth = lastMonth;
  homeContinuing = continuing;
  const locked = playedToday(save) && !(script.active && script.stop !== "home");
  // Partway through a month: the choices so far, with the result line each showed
  const thisMonth = continuing ? (lifeSoFar(save)?.find((m) => m.month === state.month)?.choices ?? []) : [];
  // The chapter and its title are the sheet's, on this month's decisions. Read as if none were
  // taken yet, so a month whose decisions are all made still has its heading
  const [next] = decisionsForMonth({ ...state, decisions_taken: {} });
  const chapter = next?.chapter_title ? { number: formatCount(next.chapter), title: next.chapter_title } : null;
  const screen = homeScreen({
    chapter,
    bars: getBars(state),
    labels: barLabels(state),
    // Before any month is closed nothing has moved: every bar compared with itself
    compared: lastMonth ?? compareBars(getBars(state), getBars(state)),
    marks: barMarks(),
    locked,
    safetyDanger: safetyInDanger(state),
    month: state.month,
    age: state.age,
    money: formatMoney,
    streak: currentStreak(save),
    hook: nextHook(),
    continuing,
    thisMonth,
    onPlay: continuing ? continueMonth : startMonth,
    onTimeline: () => openTimeline(),
    onHowItWorks: () => openHowItWorks(),
  });
  show(screen);
  if (holding("timeline")) openTimeline();
  else if (holding("how")) openHowItWorks();
  else if (script.active && !holding("home") && !locked) screen.querySelector(".action").click();
}

// The life so far, from the save. Close goes back where it came from: Home as it was, or
// the chapter report.
function openTimeline(back = () => goHome(homeLastMonth, homeContinuing)) {
  const months = lifeSoFar(save);
  if (!months) return;
  const [first] = months;
  const open = holding("timeline") && query.get("month") ? Number(query.get("month")) : null;
  show(timelineScreen({
    months,
    chapter: first?.chapterTitle ? { number: formatCount(first.chapter), title: first.chapterTitle } : null,
    money: formatMoney,
    open,
    onClose: back,
  }));
}

// How it works, from Home: the board again, read-only. Close goes back to Home as it was.
// With the testing tools on, it can also delete the run and go back to the landing screen.
function openHowItWorks() {
  show(howItWorksScreen({
    testTools: TEST_TOOLS,
    onRestart: restart,
    onClose: () => goHome(homeLastMonth, homeContinuing),
  }));
}

// Testing only (TEST_TOOLS): the save goes, and the run with it. The landing screen starts a new one
function restart() {
  dropSave();
  save = null;
  state = null;
  monthStart = null;
  homeLastMonth = null;
  homeContinuing = false;
  showLanding();
}

// The landing, with its opening the first time only
function showLanding() {
  show(landingScreen(begin, { intro: !introSeen(), onIntroSeen: recordIntroSeen }));
}

// Testing only (TEST_TOOLS): the run is replaced by one the Balanced player played to the start
// of month, and the tester lands on Home there, playable today
function jumpTo(month) {
  dropSave();
  const jumped = jumpSave(SEED, month, BALANCED_CHOICES);
  writeSave(jumped);
  if (!resume(jumped)) restart();
}

// Reopening: the save replays through the engine, and the player always lands on Home
// (ruled 28 September 2026, FIRST-SESSION.md). Partway through a month, Home lists the choices
// made so far and its button continues the month: the month card, then the next decision, or
// the month's run when every decision is made.
function resume(saved) {
  const where = replay(saved);
  if (!where) {
    dropSave();
    return false;
  }
  save = saved;
  state = where.state;
  monthStart = where.monthStart;
  goHome(where.lastMonth, where.at !== "home");
  return true;
}

const saved = script.active ? null : readSave();
if (!saved || !resume(saved)) {
  showLanding();
  if (script.active && script.stop !== "landing") document.querySelector(".action").click();
}
// The web address backup for the testing tools: /game/?restart opens their panel. The address is
// tidied at once, so a reload does not open it again
if (testing && query.has("restart")) {
  history.replaceState(null, "", location.pathname);
  testing.openPanel();
}
