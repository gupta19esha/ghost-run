// Save and resume (UI.md step 5). One localStorage key holds the run.
//
// The save is not the engine's state. It is what the player did: the seed, every choice in
// the order it was made, how many months they have closed, the day they last closed one, the
// streak of days in a row that ended on, which bars have had their line shown, the day the
// run began, the day each chapter closed, and which chapters' start screens have been seen. Resuming replays those choices through the
// engine, so the run is the same run (UI.md build rule 4) and the save stays small.
//
// The daily gate (UI.md, ruled 31 October 2026): the first FIRST_SITTING_MONTHS months play in
// one sitting. After that, one month a day is the way the game is meant to be played: Home
// waits for tomorrow once a month has closed today, and offers the next month now as well. A
// month started and left unfinished does not use up the day.
//
// The format is version 1 and stays 1. A field added later goes beside the others, and
// upgrade() fills it in when an older save lacks it, so every save written before it still
// reads. readSave refuses any save whose version is not VERSION, so raising VERSION would throw
// every existing run away. A field an older save cannot know, such as startedOn, is null, and
// whatever shows it says nothing rather than guess.
//
// A save that no longer reads or replays, because the sheet changed under it, is not deleted:
// it is set aside under SET_ASIDE_KEY, where the next such save replaces it, and the player
// starts again from the landing screen.

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getBars, compareBars, chapterComplete,
} from "../engine/index.js";
import { SAVE_KEY, FIRST_SITTING_MONTHS } from "./config.js";
import { DEFAULT_CHARACTER } from "./character.js";

const VERSION = 1;
// Where a save that no longer reads or replays is kept instead of deleted
export const SET_ASIDE_KEY = `${SAVE_KEY}-set-aside`;

// The device's calendar day, "2026-09-18". One session per day is a local day.
export function today() {
  return new Date().toLocaleDateString("en-CA");
}

function yesterday() {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  return day.toLocaleDateString("en-CA");
}

export function newSave({ seed }) {
  return {
    version: VERSION, seed, choices: [], closed: 0, closedOn: null, streak: 0, explained: [],
    startedOn: today(), chapterClosedOn: {}, chaptersOpened: [], character: DEFAULT_CHARACTER,
  };
}

// An older save, brought up to the fields this one writes, without changing any it has.
// startedOn is unknown for a run begun before it was recorded, so null.
export function upgrade(save) {
  return {
    closed: 0, closedOn: null, streak: 0, explained: [], startedOn: null, chapterClosedOn: {}, chaptersOpened: [], character: DEFAULT_CHARACTER,
    ...save,
  };
}

// Each bar's line shows once per player (ruled 30 September 2026, ONBOARDING.md section 5):
// the first time the bar moves on a result, and all four at the month 1 close. Once month 1
// has closed every bar has been explained, which also covers a save from before the list.
export function explainedAlready(save, key) {
  return save.closed >= 1 || (save.explained ?? []).includes(key);
}

export function recordExplained(save, key) {
  save.explained = [...new Set([...(save.explained ?? []), key])];
}

// The chapter start (UI.md rule 11) shows once per chapter, before its first month. An older
// save has none recorded: it is past chapter 1's first month unless it has closed none, and
// then seeing it once is right
export function chapterOpened(save, chapter) {
  return (save.chaptersOpened ?? []).includes(chapter);
}

export function recordChapterOpened(save, chapter) {
  save.chaptersOpened = [...new Set([...(save.chaptersOpened ?? []), chapter])];
}

// Testing only (TEST_TOOLS, game/testing.js): a run played for the tester up to the start of
// month, every earlier month closed. Replayed like any save, it lands on Home at the start of
// that month, playable today. path: the option to take for each decision, by decision id,
// the Balanced player's (game/balanced-path.js, ruled 30 September 2026). A decision it has no
// offered choice for, which only a sheet change without re-running the export can cause, takes
// its first offered option.
export function jumpSave(seed, month, path = {}) {
  let state = createState(seed);
  const choices = [];
  while (state.month < month && !chapterComplete(state)) {
    for (;;) {
      const [decision] = decisionsForMonth(state);
      if (!decision) break;
      const recorded = path[decision.decision_id];
      const optionId = decision.options[recorded] ? recorded : Object.keys(decision.options)[0];
      state = applyDecision(state, decision.decision_id, optionId).state;
      choices.push(optionId);
    }
    state = advanceMonth(state).state;
  }
  return { ...newSave({ seed }), choices, closed: state.month - 1 };
}

// The landing's opening plays in full once (ruled 30 September 2026). Whether it has is kept
// apart from the save, so a dropped save or a tester's Start again does not play it again
const INTRO_KEY = "finance-sim-intro-seen";

export function introSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch (whatever) {
    return false;
  }
}

export function recordIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch (whatever) {
    // No storage: the opening plays again next time, which costs two seconds.
  }
}

// Private browsing can refuse storage. The run carries on unsaved; nothing else changes.
export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (whatever) {
    // No storage, no resume.
  }
}

// The save, upgraded, or null for none. One that is there but does not read is set aside
// first, so starting again cannot write over it
export function readSave() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const save = JSON.parse(raw);
    if (save?.version === VERSION && Number.isInteger(save.seed) && Array.isArray(save.choices)) return upgrade(save);
  } catch (whatever) {
    // Not JSON, or no storage
  }
  if (raw !== null) setAside(raw);
  return null;
}

function setAside(raw) {
  try {
    localStorage.setItem(SET_ASIDE_KEY, raw);
  } catch (whatever) {
    // No storage, nothing to keep.
  }
}

// Home's button waits for tomorrow once a month has been closed today, after the first sitting
export function waitsForTomorrow(save) {
  return save.closed >= FIRST_SITTING_MONTHS && save.closedOn === today();
}

// The streak (UI.md step 7): days in a row on which the player closed a month. Closing one
// the day after the last adds a day; a second close on the same day, in the first sitting or
// played early, changes nothing, so playing on costs the streak nothing; anything later starts
// again at one. chapter: the chapter this close completes, or null.
export function recordClose(save, month, chapter = null) {
  const day = today();
  if (save.closedOn !== day) save.streak = save.closedOn === yesterday() ? (save.streak ?? 0) + 1 : 1;
  save.closed = month;
  save.closedOn = day;
  if (chapter !== null) save.chapterClosedOn = { ...save.chapterClosedOn, [chapter]: day };
}

// The calendar days a chapter took, counting the day it began and the day it closed: 1 for a
// chapter played in one day. null when either day is unknown, as for a run begun before the
// save recorded its first day. A chapter after the first begins the day the one before closed.
export function chapterDays(save, chapter) {
  const began = chapter === 1 ? save.startedOn : save.chapterClosedOn?.[chapter - 1];
  const closed = save.chapterClosedOn?.[chapter];
  if (!began || !closed) return null;
  const day = (text) => {
    const [y, m, d] = text.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((day(closed) - day(began)) / 86400000) + 1;
}

// The streak as it stands: alive while the last close was today or yesterday, otherwise
// broken, which is 0 (free tier: a streak can break; HANDOFF section 4)
export function currentStreak(save) {
  return save.closedOn === today() || save.closedOn === yesterday() ? save.streak ?? 0 : 0;
}

// Testing only (Start again, a jump to a month): the run goes
export function dropSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (whatever) {
    // Nothing to drop.
  }
}

// A save that does not replay: kept under SET_ASIDE_KEY, then taken off the run
export function setAsideSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw !== null) setAside(raw);
  } catch (whatever) {
    // No storage.
  }
  dropSave();
}

// Replays the save through the engine and says where the player was:
//   "home"      between months: every chosen month is closed
//   "decision"  partway through a month's decisions
//   "run"       every decision of the month made, but the month not yet closed: it runs
//               again from its callbacks, and the player sees its close
// Once the chapter is complete there is nothing left to run: the player is "home", where the
// chapter report stands.
// monthStart is the bars as the current month found them. lastMonth is compareBars over the
// last closed month, for Home, or null before the first.
// hooks, optional, for the timeline: onChoice(state, decision, optionId) after each choice is
// applied, and onClose(month, compared) as each closed month runs.
// Returns null when the save does not replay.
export function replay(save, hooks = {}) {
  try {
    let state = createState(save.seed);
    let monthStart = getBars(state);
    let lastMonth = null;
    const queue = [...save.choices];
    for (;;) {
      for (const decision of decisionsForMonth(state)) {
        const next = queue[0];
        if (!next || !decision.options[next]) break;
        const optionId = queue.shift();
        state = applyDecision(state, decision.decision_id, optionId).state;
        hooks.onChoice?.(state, decision, optionId);
      }
      const left = decisionsForMonth(state).length;
      if (left > 0) {
        if (queue.length > 0) return null; // a choice the sheet does not offer here
        const started = decisionsForMonth(state).length < decisionsForMonth({ ...state, decisions_taken: {} }).length;
        return { state, monthStart, lastMonth, at: started ? "decision" : "home" };
      }
      if (chapterComplete(state)) {
        return queue.length > 0 ? null : { state, monthStart, lastMonth, at: "home" };
      }
      if (state.month > save.closed) {
        return queue.length > 0 ? null : { state, monthStart, lastMonth, at: "run" };
      }
      const { state: next, events } = advanceMonth(state);
      lastMonth = compareBars(monthStart, events.find((e) => e.type === "bars"));
      hooks.onClose?.(state.month, lastMonth);
      state = next;
      monthStart = getBars(state);
    }
  } catch (whatever) {
    return null;
  }
}
