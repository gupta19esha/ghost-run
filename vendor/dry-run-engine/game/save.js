// Save and resume (UI.md step 5). One localStorage key holds the run.
//
// The save is not the engine's state. It is what the player did: the seed, every choice in
// the order it was made, how many months they have closed, the day they last closed one, the
// streak of days in a row that ended on, and which bars have had their line shown.
// One session per day means one month closed per local day: a month started and left
// unfinished does not use up the day. Resuming replays those choices through the engine, so
// the run is the same run (UI.md build rule 4) and the save stays small.
//
// A save that no longer replays, because the sheet changed under it, is dropped and the
// player starts again from the landing screen. There is no older format to carry forward.

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getBars, compareBars, chapterComplete,
} from "../engine/index.js";
import { SAVE_KEY } from "./config.js";

const VERSION = 1;

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
  return { version: VERSION, seed, choices: [], closed: 0, closedOn: null, streak: 0, explained: [] };
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

export function readSave() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (save?.version !== VERSION || !Array.isArray(save.choices)) return null;
    return save;
  } catch (whatever) {
    return null;
  }
}

// Home's button waits for tomorrow once a month has been closed today
export function playedToday(save) {
  return save.closedOn === today();
}

// The streak (UI.md step 7): days in a row on which the player closed a month. Closing one
// the day after the last adds a day; a second close on the same day, which only a
// screenshot script can make, changes nothing; anything later starts again at one.
export function recordClose(save, month) {
  const day = today();
  if (save.closedOn !== day) save.streak = save.closedOn === yesterday() ? (save.streak ?? 0) + 1 : 1;
  save.closed = month;
  save.closedOn = day;
}

// The streak as it stands: alive while the last close was today or yesterday, otherwise
// broken, which is 0 (free tier: a streak can break; HANDOFF section 4)
export function currentStreak(save) {
  return save.closedOn === today() || save.closedOn === yesterday() ? save.streak ?? 0 : 0;
}

export function dropSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (whatever) {
    // Nothing to drop.
  }
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
      // The end of what is written: a month with nothing in the sheet. Until v35 this was the end
      // of chapter 1, which with chapter 2 in the sheet would drop every save that had gone past it
      if (decisionsForMonth({ ...state, decisions_taken: {} }).length === 0) {
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
