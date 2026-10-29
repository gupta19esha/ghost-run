// Headless replay of a run: the seed and the choices in the order they were made, played
// through the engine from createState. This is the replay game/save.js does on resume, without
// the DOM, localStorage or the save's bookkeeping, so it runs unchanged in Node and in a browser.
//
// The engine in vendor/ is imported, never edited: every timeline must run through the same
// engine code, or comparing two of them means nothing.

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getBars, getHistory, chapterComplete,
} from "../vendor/dry-run-engine/engine/index.js";

// Plays from month 1. choose(decision, state, index) returns the option id for the index-th
// choice of the run, or null to stop there. `decision` carries only the options the state offers
// (rule 29), and is asked for again after every choice, so a choice that changes what a later
// decision of the same month offers is seen.
//
// A month is closed once every decision in it is made. The run stops at the first decision with
// no choice, leaving that month open, or when the chapter is complete.
//
// Returns the final state, the engine's history, the bars at the end of each closed month, the
// choices made and the decision each one answered.
export function play(seed, choose) {
  let state = createState(seed);
  const bars = [];
  const choices = [];
  const decisions = [];
  for (;;) {
    if (chapterComplete(state)) break;
    let stopped = false;
    for (;;) {
      const [decision] = decisionsForMonth(state);
      if (!decision) break;
      const optionId = choose(decision, state, choices.length);
      if (optionId === null || optionId === undefined) {
        stopped = true;
        break;
      }
      if (!decision.options[optionId]) {
        throw new Error(`Choice ${choices.length}, ${optionId}, is not offered at ${decision.decision_id} in month ${state.month}`);
      }
      state = applyDecision(state, decision.decision_id, optionId).state;
      choices.push(optionId);
      decisions.push(decision.decision_id);
    }
    if (stopped) break;
    const month = state.month;
    state = advanceMonth(state).state;
    bars.push({ month, ...getBars(state) });
  }
  return { state, history: getHistory(state), bars, choices, decisions };
}

// replay(seed, choices) -> { state, history, bars }
// bars: { month, netWorth, safety, freedom, life } at the end of each closed month.
// Throws when a choice is not offered where it falls, or when there are more choices than the
// chapter has decisions: a save that does not replay (game/save.js returns null for both).
export function replay(seed, choices) {
  const run = play(seed, (decision, state, index) => (index < choices.length ? choices[index] : null));
  if (run.choices.length < choices.length) {
    throw new Error(`${choices.length - run.choices.length} choices left over after the chapter ended`);
  }
  return { state: run.state, history: run.history, bars: run.bars };
}
