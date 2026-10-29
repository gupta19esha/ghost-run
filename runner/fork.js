// The branch runner: the run the player made, and the ghost of the run they did not.
//
// fork(save, monthIndex, alternativeOptionId) replays the save untouched (real), and replays the
// same seed again with one choice replaced (ghost). Every choice after the fork is carried forward
// from the real run, decision by decision. Both go through the same engine code in vendor/.
//
// After the fork, rule 29 (maths doc section 10) can withdraw a later real choice from the ghost:
// a real D16-A player who chose D20-A has no index investment to move on a ghost that took D16-B.
// What the ghost does then is the substitution rule. It is not ruled, so there is no default:
// fork refuses to run until a rule is passed in, or SUBSTITUTION below is set.

import { play } from "./replay.js";
import { getDecision } from "../vendor/dry-run-engine/engine/index.js";

// A substitution rule: ({ decision, real, state }) -> option id, or null to end the ghost there.
// decision carries only the options the ghost's state offers; real is the option the player
// chose for that decision on the real run, and realOption its sheet columns, read from the
// full decision because the offered copy may not carry it.
//
// Every rule keeps the real choice whenever the ghost still offers it. They differ only in the
// fallback, for a real choice the ghost no longer offers.
const keepRealChoiceIfOffered = (fallback) => (context) =>
  context.decision.options[context.real] ? context.real : fallback(context);

// Money an option moves: one-off plus 24 months of its monthly amounts, plus anything it puts on
// the card. The calibration harness's measure for its quiet option (calibration/harness.js
// `moves`), restated because the harness reads the doc from disk and cannot run in a browser.
const QUIET_MONTHS = 24;
export const moves = (o) => Math.abs((o.money_once || 0) + (o.money_once_2 || 0)) +
  QUIET_MONTHS * Math.abs((o.money_monthly || 0) + (o.money_monthly_2 || 0)) + (o.card_balance || 0);

// The offered option the sheet lists first: what game/save.js's jumpSave does with a choice
// that is not offered
const firstOffered = ({ decision }) => Object.keys(decision.options)[0];

// The offered option that moves the least money, ties to sheet order: what the calibration
// harness's play() does with a choice fixed in advance for another path
const quietest = ({ decision }) =>
  Object.values(decision.options).map((o, i) => ({ o, i })).sort((a, b) => moves(a.o) - moves(b.o) || a.i - b.i)[0].o.option_id;

// The offered option whose authored Life effect, (life, def_life), is nearest the real option's,
// ties to the quiet option then sheet order. A stand-in for "the option most like what the
// player did": the sheet's life columns are the only authored description of how a choice feels.
const nearestLife = ({ decision, real, realOption }) => {
  const distance = (o) => Math.hypot((o.life || 0) - (realOption.life || 0), (o.def_life || 0) - (realOption.def_life || 0));
  return Object.values(decision.options).map((o, i) => ({ o, i }))
    .sort((a, b) => distance(a.o) - distance(b.o) || moves(a.o) - moves(b.o) || a.i - b.i)[0].o.option_id;
};

// End the ghost at the first real choice it cannot follow. The divergence then covers only the
// months both runs closed.
const stop = () => null;

export const STRATEGIES = Object.freeze({
  "keep-real-or-first": keepRealChoiceIfOffered(firstOffered),
  "keep-real-or-quiet": keepRealChoiceIfOffered(quietest),
  "keep-real-or-nearest-life": keepRealChoiceIfOffered(nearestLife),
  "keep-real-or-stop": keepRealChoiceIfOffered(stop),
});

// Not ruled. The ruling names one of STRATEGIES here.
export const SUBSTITUTION = null;

const BARS = ["netWorth", "safety", "freedom", "life"];

// fork(save, monthIndex, alternativeOptionId, { substitution }) -> { real, ghost, divergence }
//
// monthIndex is the position of the choice in save.choices, 0 for the first. Chapter 1 has 30
// decisions in 24 months, so a month can hold two choices; alternativeOptionId must be an option
// of the decision that choice answered, and offered there.
// substitution: a name in STRATEGIES or a rule function. Defaults to SUBSTITUTION.
//
// real and ghost: { state, history, bars, choices }. ghost.substitutions lists each later real
// choice the ghost could not follow: { index, decision_id, month, real, offered, chosen }, where
// chosen is null when the rule ended the ghost there. ghost.stoppedAt is that index, or null.
// divergence: for each month both runs closed, ghost minus real, for net worth and the four bars.
export function fork(save, monthIndex, alternativeOptionId, { substitution = SUBSTITUTION } = {}) {
  const rule = typeof substitution === "string" ? STRATEGIES[substitution] : substitution;
  if (typeof rule !== "function") {
    throw new Error(substitution == null
      ? "No substitution rule: none is ruled yet, so pass { substitution } (see STRATEGIES)"
      : `Unknown substitution rule ${JSON.stringify(substitution)}`);
  }
  const realRun = play(save.seed, (decision, state, index) => (index < save.choices.length ? save.choices[index] : null));
  if (realRun.choices.length < save.choices.length) throw new Error("The save does not replay: choices left over");
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex >= realRun.choices.length) {
    throw new Error(`No choice at index ${monthIndex}: the save has ${realRun.choices.length}`);
  }
  const forkDecision = realRun.decisions[monthIndex];
  const realChoice = Object.fromEntries(realRun.decisions.map((id, i) => [id, realRun.choices[i]]));

  const substitutions = [];
  let stoppedAt = null;
  const ghostRun = play(save.seed, (decision, state, index) => {
    if (index < monthIndex) return realRun.choices[index];
    if (index === monthIndex) {
      if (decision.decision_id !== forkDecision) throw new Error(`Choice ${index} is ${forkDecision} on the real run but ${decision.decision_id} on the ghost`);
      if (!decision.options[alternativeOptionId]) {
        throw new Error(`${alternativeOptionId} is not offered at ${forkDecision} on this run (rule 29, or not an option of ${forkDecision})`);
      }
      return alternativeOptionId;
    }
    const real = realChoice[decision.decision_id];
    // The real run stopped before this decision: so does the ghost
    if (!real) return null;
    const chosen = rule({ decision, real, realOption: getDecision(decision.decision_id).options[real], state });
    if (chosen !== real) {
      substitutions.push({ index, decision_id: decision.decision_id, month: state.month, real, offered: Object.keys(decision.options), chosen });
      if (chosen === null) stoppedAt = index;
    }
    return chosen;
  });

  const real = { state: realRun.state, history: realRun.history, bars: realRun.bars, choices: realRun.choices };
  const ghost = { state: ghostRun.state, history: ghostRun.history, bars: ghostRun.bars, choices: ghostRun.choices, substitutions, stoppedAt };
  return { real, ghost, divergence: divergence(real.bars, ghost.bars) };
}

// Ghost minus real for every month both runs closed
export function divergence(realBars, ghostBars) {
  const ghostByMonth = new Map(ghostBars.map((b) => [b.month, b]));
  return realBars.filter((r) => ghostByMonth.has(r.month)).map((r) => {
    const g = ghostByMonth.get(r.month);
    return { month: r.month, ...Object.fromEntries(BARS.map((k) => [k, g[k] - r[k]])) };
  });
}

// The options a fork at monthIndex can take instead of the player's: those the state offers at
// that choice (rule 29), other than the one the player chose
export function alternativesAt(save, monthIndex) {
  let offered = null;
  play(save.seed, (decision, state, index) => {
    if (index < monthIndex) return save.choices[index];
    offered = Object.keys(decision.options);
    return null;
  });
  if (!offered) throw new Error(`No choice at index ${monthIndex}`);
  return offered.filter((id) => id !== save.choices[monthIndex]);
}
