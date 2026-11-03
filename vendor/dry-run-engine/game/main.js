// The playable Chapter 1, UI.md version 2. Step 5: save and resume, one month a day after the
// first sitting. The session loop is the month card, each of the month's decisions with its
// consequence, the month run by the engine, any callbacks that land, then the month close.
// Close goes Home, which is the chapter's road, and Home plays the next month: straight on for the first three months, then
// once a day, with the next month offered now as well (ruled 31 October 2026). The first month
// starts straight from the landing screen. Reopening continues where the player was
// (game/save.js).
//
// Look, copy and illustration come from design/, which is the source of truth.

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getDecision, conceptForMonth, chapterMonths, chapterComplete,
  chapterPlace, monthSummary, getBars, compareBars, barMarks,
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
import { timelineScreen, roadView } from "./screens/timeline.js";
import { howItWorksScreen } from "./screens/how-it-works.js";
import { reportScreen } from "./screens/report.js";
import { chapterTurnScreen } from "./screens/chapter-turn.js";
import { certificateScreen } from "./screens/certificate.js";
import { ideasScreen, ideaScreen } from "./screens/ideas.js";
import { chapterInfo } from "./chapters.js";
import { ideasSoFar, longIdea } from "./ideas.js";
import { chapterProgress, createStrip } from "./progress.js";
import { chapterCard, lockedChapterCard } from "./certificate.js";
import { barLabels } from "./labels.js";
import { createRail, ways } from "./rail.js";
import { lifeSoFar, roadStops } from "./timeline.js";
import { DEFAULT_CHARACTER } from "./character.js";
import {
  newSave, readSave, writeSave, dropSave, setAsideSave, replay, waitsForTomorrow, recordClose, currentStreak, chapterDays,
  explainedAlready, recordExplained, jumpSave, introSeen, recordIntroSeen, chapterOpened, recordChapterOpened, recordTicked,
  ideaHintsLeft, recordIdeaHint,
} from "./save.js";
import { installTestingTools } from "./testing.js";
import { BALANCED_CHOICES } from "./balanced-path.js";
// The site's sounds, the ghost run's, shared: synthesized, soft, and off when the player muted them
import { sound } from "/web/sound.js";

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
// decision, consequence, callback, close, timeline, how, ideas, start, turn, card or report. With stop=timeline, month= opens that
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

// view: what the rail holds beside the screen on a desktop window (game/rail.js), or null for a
// screen that stands alone. progress: the chapter's progress strip above it on a phone, by
// default the view's, which every screen of a month and Home has (UI.md rule 10); null for none
export function show(screen, view = null, progress = view?.progress ?? null) {
  rail.show(view);
  strip.set(progress);
  app.replaceChildren(screen);
  testing?.shown(screen);
  screen.start?.();
}

// The rail, on a desktop window: net worth and the bars, beside every screen of a month, Home,
// the timeline and How it works (game/rail.js)
const rail = createRail();
document.body.append(rail.element);
// The chapter's progress on a phone: a strip above the screens (game/progress.js). On a desktop
// window the rail holds it instead
const strip = createStrip();
document.body.insertBefore(strip.element, app);
// The chapter the rail names: the sheet's, on the month's decisions, kept through a month that
// has none left, such as the close of the chapter's last
let railChapter = null;
// What the rail held on Home, for the screens Home opens
let homeBoard = null;

// What the rail holds: the engine's figures now, each bar coloured by how it has moved since
// the month began. from and to: getBars readings, when something moves on this screen (moving:
// the rail moves the bars and counts net worth from one to the other). compared: compareBars to
// colour by instead. The rest goes to the rail as it is: month, chip, moved, explanations, quiet
function board({ from = monthStart, to = getBars(state), moving = false, compared = null, ...rest } = {}) {
  const [next] = decisionsForMonth({ ...state, decisions_taken: {} });
  if (next?.chapter_title) railChapter = { number: formatCount(next.chapter), title: next.chapter_title };
  const way = ways(compared ?? compareBars(from, to));
  const start = moving ? from : to;
  // The month on screen, in its chapter: the months before state.month are closed, so at a
  // month's close, where state has moved on, its own month counts as closed too
  const month = rest.month ?? state.month;
  return {
    chapter: railChapter,
    month: state.month,
    age: state.age,
    money: formatMoney,
    netWorth: { from: start.netWorth, to: to.netWorth },
    chip: null,
    bars: Object.fromEntries(Object.keys(way).map((key) => [key, { from: start[key], to: to[key], way: way[key] }])),
    labels: barLabels(state),
    marks: barMarks(),
    danger: safetyInDanger(state),
    progress: chapterProgress(month, chapterPlace(month), state.month - 1),
    ...rest,
  };
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

// A chapter's first month opens with the chapter start the first time (UI.md rule 11): for
// chapter 1 that is straight after Begin. It is recorded as seen once it shows, so a reload or a
// return from Home goes straight to the month. A screenshot script passes it unless it stops there
function startMonth() {
  const place = chapterPlace(state.month);
  const first = place?.index === 1 && !chapterOpened(save, place.chapter);
  if (first && !(script.active && !holding("start"))) {
    recordChapterOpened(save, place.chapter);
    writeSave(save);
    showChapterStart(place.chapter, startMonth);
    return;
  }
  monthStart = getBars(state);
  showMonthCard();
}

// The chapter's ideas as the player has them: collected once ticked (game/ideas.js). closed: the
// months to count as closed, by default the save's
const ideasOf = (chapter = 1, closed = save.closed) => ideasSoFar(closed, chapter, save.ticked ?? null);

// The road for a chapter, from the save. Once the chapter is finished its card is the player's
// own; before, it is locked
function roadOf(chapter, months) {
  const info = chapterInfo(chapter);
  const ideas = ideasOf(chapter);
  return {
    stops: roadStops(months.filter((m) => m.chapter === chapter), { chapter, cards: ideas.cards, reached: state.month }),
    chapter: { number: formatCount(chapter), title: info.name, span: `${info.ages.from} to ${info.ages.to} · ${info.months} months`, count: ideas.count },
    money: formatMoney,
    card: chapterComplete(state, chapter) ? chapterCard(state, save, chapter) : lockedChapterCard(chapter),
    character: save.character ?? DEFAULT_CHARACTER,
  };
}

// Whether the character walks on Home once a month has closed: not under reduced motion, nor for
// a screenshot script
const walks = () => !script.active && !matchMedia("(prefers-reduced-motion: reduce)").matches;

// The chapter opens on its road (UI.md rule 11), all of it ahead
function showChapterStart(chapter, onPlay) {
  show(timelineScreen({
    ...roadOf(chapter, lifeSoFar(save) ?? []),
    onIdea: () => {},
    onPlay,
    onCharacter: (id) => {
      save.character = id;
      writeSave(save);
    },
  }));
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
  }), board());
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
  show(screen, board({ quiet: true }));
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
  }), board({
    from: bars.before,
    to: bars.after,
    moving: true,
    moved: move?.key ?? null,
    explanations: explanation ? { [move.key]: explanation } : null,
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
  showCallbacks(texts, closed, () => closeMonth(closed, monthEnd));
}

// closed: the month the callbacks land in. The engine has moved on to the next, so the rail and
// the progress say this one, as its close will
function showCallbacks(texts, closed, then) {
  if (texts.length === 0) {
    then();
    return;
  }
  const [text, ...rest] = texts;
  show(callbackScreen({
    text,
    holdMs: CALLBACK_MS,
    hold: holding("callback"),
    onDone: () => showCallbacks(rest, closed, then),
  }), board({ month: closed }));
}

function closeMonth(closed, monthEnd) {
  const screen = monthCloseScreen({
    month: closed,
    compared: compareBars(monthStart, monthEnd),
    safetyDanger: safetyInDanger(state),
    hook: nextHook(),
    concepts: conceptForMonth(closed) ? [{ month: closed, ...conceptForMonth(closed) }] : [],
    // The count so far: this month's card is collected once it is ticked (ruled 3 November 2026)
    ideas: ideasOf(chapterPlace(closed)?.chapter ?? 1, closed).count,
    onTick: (month) => {
      recordTicked(save, month);
      writeSave(save);
      return ideasOf(chapterPlace(month)?.chapter ?? 1, closed).count;
    },
    // Read more: the card's long version, over the close
    longIdea: (month, close) => ideaScreen({ month, idea: longIdea(month, save), onClose: close }),
    // The count: the collection, over the close, as it stands with this month closed
    collection: (close, swap) => collectionOver(closed, close, swap, () => screen),
    sounds: { collect: sound.confirm, count: sound.rise },
    hintsLeft: () => ideaHintsLeft(save),
    onHint: () => {
      recordIdeaHint(save);
      writeSave(save);
    },
    // The month 1 close says what all four measure (ruled 30 September 2026)
    explanations: closed === 1 ? BAR_LINES : null,
    money: formatMoney,
    onClose: () => {
      // The chapter's last month records the day it closed, for the report's count of days
      recordClose(save, closed, chapterComplete(state) ? 1 : null);
      writeSave(save);
      // The chapter's last month: the turn of the chapter, then its card, then the report
      if (chapterComplete(state)) closeChapter();
      else goHome(compareBars(monthStart, monthEnd), false, { walkFrom: walks() ? closed : null });
    },
  });
  show(screen, board({
    from: monthStart,
    to: monthEnd,
    moving: true,
    month: closed,
    explanations: closed === 1 ? BAR_LINES : null,
  }));
  // A screenshot script ticks the month's card on its way through, as a player collecting it would
  if (script.active && !holding("close")) {
    screen.querySelector(".concept-tick")?.click();
    screen.querySelector(".close-button").click();
  }
}

// The collection over month close (its count's button), counting the month being closed. A card
// opens its long version in its place, whose Close comes back to the collection; a card ticked
// here is ticked on the close too
function collectionOver(closed, close, swap, closeScreen) {
  const chapter = chapterPlace(closed)?.chapter ?? 1;
  const again = (at = null) => {
    const section = ideasScreen({
      chapter: { number: formatCount(chapter), name: null },
      ideas: ideasOf(chapter, closed),
      at,
      onClose: close,
      onOpen: (month) => swap(ideaScreen({ month, idea: longIdea(month, save), onClose: () => swap(again(month)) })),
      onTick: (month) => {
        recordTicked(save, month);
        writeSave(save);
        closeScreen().collected?.(month, ideasOf(chapter, closed).count);
        swap(again(month));
      },
    });
    return section;
  };
  return again();
}

// The words after the change beside net worth in the rail on Home, as Home has them
const THIS_MONTH = "this month";

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
const CLOSE_CARD = "Close";

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
    ideas: ideasOf().count,
    onIdeas: () => openIdeas(showReport, null),
    concepts: {
      total: titles.length,
      count: formatCount(titles.length),
      titles: listed,
      rest: titles.length > listed.length ? formatCount(titles.length - listed.length) : null,
    },
    money: formatMoney,
    // How long the chapter took, stated and not judged: its months, and the calendar days it was
    // played over. A run begun before the save recorded its first day has no count of days
    played: { months: formatCount(months.length), days: optionalCount(chapterDays(save, 1)) },
    onTimeline: () => openTimeline(showReport, null),
    ghostHref: GHOST_RUN,
    onCard: () => showCard(chapterCard(state, save), CARD_BACK, showReport),
  }));
}

// The ghost run, on the player's own finished chapter
const GHOST_RUN = "/ghost/?run=mine";

// The report names this many concepts, then counts the rest (design/ChapterReport.html)
const REPORT_CONCEPTS_LISTED = 8;

const optionalCount = (count) => (count === null ? null : formatCount(count));

// Home: the engine's bars as they stand, coloured by the month just closed. After the first
// sitting its button waits for tomorrow once a month has been closed today, and the line under
// it plays the next month now (UI.md step 5, ruled 31 October 2026). A screenshot script plays
// past it, unless the screen it is there to capture is Home itself.
// walkFrom: the month just closed, which the character walks on from. open: a month to show
// opened on the road, as it was when one of its ideas was opened from there
function goHome(lastMonth, continuing = false, { walkFrom = null, open = null } = {}) {
  // Once the chapter's last month has closed, the chapter report stands where Home would
  if (chapterComplete(state)) {
    showReport();
    return;
  }
  homeLastMonth = lastMonth;
  homeContinuing = continuing;
  const locked = waitsForTomorrow(save) && !(script.active && script.stop !== "home");
  // The chapter and its title are the sheet's, on this month's decisions. Read as if none were
  // taken yet, so a month whose decisions are all made still has its heading
  const [next] = decisionsForMonth({ ...state, decisions_taken: {} });
  const chapter = next?.chapter_title ? { number: formatCount(next.chapter), title: next.chapter_title } : null;
  const months = lifeSoFar(save) ?? [];
  const place = chapterPlace(state.month)?.chapter ?? 1;
  const back = (month) => () => goHome(homeLastMonth, homeContinuing, { open: month });
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
    money: formatMoney,
    streak: currentStreak(save),
    hook: nextHook(),
    ideas: ideasOf().count,
    onIdeas: () => openIdeas(),
    continuing,
    onPlay: continuing ? continueMonth : startMonth,
    onHowItWorks: () => openHowItWorks(),
    // Partway through a month, its stop stands open on the choices so far
    road: roadView({
      ...roadOf(place, months),
      open: open ?? (continuing ? state.month : null),
      onIdea: (month) => openIdeas(back(month), homeBoard, month),
    }),
    open: open ?? (continuing ? state.month : null),
    walkFrom,
  });
  const moved = lastMonth?.netWorth.change ?? 0;
  homeBoard = board({
    compared: lastMonth ?? compareBars(getBars(state), getBars(state)),
    chip: moved === 0 ? null : { way: moved > 0 ? "up" : "down", text: `${formatMoney(Math.abs(moved))} ${THIS_MONTH}` },
  });
  show(screen, homeBoard);
  if (holding("timeline")) openTimeline();
  else if (holding("how")) openHowItWorks();
  else if (holding("ideas")) openIdeas();
  else if (script.active && !holding("home") && !locked) screen.querySelector(".action").click();
}

// The life so far, from the save. Close goes back where it came from: Home as it was, or
// the chapter report.
// view: the rail beside it, Home's when it opens from Home
function openTimeline(back = () => goHome(homeLastMonth, homeContinuing), view = homeBoard, at = null) {
  const months = lifeSoFar(save);
  if (!months) return;
  const [first] = months;
  const open = at ?? (holding("timeline") && query.get("month") ? Number(query.get("month")) : null);
  const chapter = first?.chapter ?? chapterPlace(state.month)?.chapter ?? 1;
  const reopen = () => openTimeline(back, view);
  show(timelineScreen({
    ...roadOf(chapter, months),
    open,
    onCard: chapterComplete(state, chapter) ? () => showCard(chapterCard(state, save, chapter), CLOSE_CARD, reopen) : null,
    // That idea, from the road. Its Close comes back to the road, at the month it was opened from
    onIdea: (month) => openIdeas(() => openTimeline(back, view, month), view, month),
    onClose: back,
  }), view, null);
}

// The ideas: every concept card of the chapter, collected or still locked (UI.md rule 10).
// Close goes back where it came from, as the timeline's does
// The chapter's name over them opens the chapter start again, whose Close comes back here
// at: the month whose idea to open at, when it comes from the road
function openIdeas(back = () => goHome(homeLastMonth, homeContinuing), view = homeBoard, at = null) {
  const chapter = chapterPlace(state.month)?.chapter ?? 1;
  show(ideasScreen({
    chapter: { number: formatCount(chapter), name: chapterInfo(chapter).name },
    ideas: ideasOf(chapter),
    at,
    onChapter: () => openTimeline(() => openIdeas(back, view, at), view),
    onClose: back,
    // A collected idea opens its long version, whose Close comes back here at that card
    onOpen: (month) => show(ideaScreen({
      month,
      idea: longIdea(month, save),
      onClose: () => openIdeas(back, view, month),
    }), view, null),
    // A card never ticked at its month's close is collected here, and the count follows
    onTick: (month) => {
      recordTicked(save, month);
      writeSave(save);
      openIdeas(back, view, month);
    },
  }), view, null);
}

// How it works, from Home: the board again, read-only. Close goes back to Home as it was.
// With the testing tools on, it can also delete the run and go back to the landing screen.
function openHowItWorks() {
  show(howItWorksScreen({
    testTools: TEST_TOOLS,
    onRestart: restart,
    onClose: () => goHome(homeLastMonth, homeContinuing),
  }), homeBoard, null);
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
    // Kept, not deleted (game/save.js)
    setAsideSave();
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
