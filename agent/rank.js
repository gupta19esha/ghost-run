// Which forks of a finished run are worth showing, in order. No model is involved: every fork is
// run through runner/fork.js and scored from its numbers alone.
//
// rank(save) forks the save at every choice, to every alternative the run offered there, and
// orders the forks by a score. The score is a parameter, as the substitution rule was, and none
// is ruled yet: SCORE is null, so rank() needs { score } until it is set. scripts/measure-rank.mjs
// measures what each score surfaces and buries.

import { fork, alternativesAt } from "../runner/fork.js";
import { getDecision } from "../vendor/dry-run-engine/engine/index.js";

const KEYS = ["netWorth", "safety", "freedom", "life"];
const BARS = ["safety", "freedom", "life"];

// One unit of each gap: the 75th percentile of the largest gap a fork opens, over every fork of
// the four player types on seeds 1 to 10 (reports/RANK-2026-10-29.md). A score of 1 is a move
// that size. Life is the bar that moves least, so a Life point counts for most.
export const UNITS = Object.freeze({ netWorth: 35000, safety: 8, freedom: 8, life: 3 });

// The layoff and the bottom of the market fall (maths doc section 14)
export const SHOCK_MONTH = 22;
// The shock is read over the three months from the last month before it to the end of the
// chapter, against the three months before that
const SHOCK_SPAN = 3;
// A reversal needs the gap held on the other side this long: a few months either way is noise
const REVERSAL_MONTHS = 6;

// Months on the path whose gap sits on the opposite side to the end gap, in the longest unbroken
// stretch, and the widest gap in that stretch
function oppositeStretch(path, k, endGap) {
  let best = { months: 0, widest: 0 };
  let run = { months: 0, widest: 0 };
  for (const row of path) {
    if (endGap !== 0 && Math.sign(row[k]) === -Math.sign(endGap)) {
      run = { months: run.months + 1, widest: Math.max(run.widest, Math.abs(row[k])) };
      if (run.months > best.months || (run.months === best.months && run.widest > best.widest)) best = run;
    } else {
      run = { months: 0, widest: 0 };
    }
  }
  return best;
}

// What a score reads from a fork: the gaps at the end, and how they got there.
//   end       ghost minus real, the last month both runs closed
//   reversal  per key, for a gap that held on the other side for REVERSAL_MONTHS or more and
//             ended on this side: the smaller of the widest gap over there and the end gap, so
//             both halves of the turn have to be real. 0 otherwise
//   shock     per key, how much the shock moved the gap beyond the drift of the same span before
//             it and beyond the gap already open when it came: an effect that only showed at
//             the shock. Null when the fork came too close to the shock to have a before
export function features(result, forkMonth) {
  const path = result.divergence.filter((row) => row.month >= forkMonth);
  const end = result.divergence.at(-1) ?? Object.fromEntries([["month", null], ...KEYS.map((k) => [k, 0])]);
  const at = (month) => result.divergence.find((row) => row.month === month);
  const before = at(SHOCK_MONTH - 1);
  const earlier = at(SHOCK_MONTH - 1 - SHOCK_SPAN);
  const shockEnd = at(SHOCK_MONTH - 1 + SHOCK_SPAN);
  const hasBefore = forkMonth <= SHOCK_MONTH - 1 - SHOCK_SPAN && before && earlier && shockEnd;
  const reversal = {};
  const shock = {};
  for (const k of KEYS) {
    const stretch = oppositeStretch(path, k, end[k]);
    reversal[k] = stretch.months >= REVERSAL_MONTHS ? Math.min(stretch.widest, Math.abs(end[k])) : 0;
    shock[k] = hasBefore
      ? Math.max(0, Math.abs(shockEnd[k] - before[k]) - Math.abs(before[k] - earlier[k]) - Math.abs(before[k]))
      : null;
  }
  return { end, reversal, shock };
}

const units = (k, value) => value / UNITS[k];

// The measures the surprise score takes the largest of, each in UNITS: [[name, value]].
//   reversal:<key>     the ghost was behind for half a year or more and ended ahead, or the
//                      other way round
//   shock:<key>        the gap opened at the shock, beyond its drift and the gap already there
//   quiet-money:<bar>  a bar ended apart while net worth ended close, scaled down as the money
//                      gap grows to one unit
//   trade-off:<bar>    net worth and Safety or Freedom ended apart in opposite directions, the
//                      smaller of the two: the ghost is richer and less safe, or poorer and freer.
//                      Not Life: spending for Life is the trade the sheet writes into nearly
//                      every option, so a ghost that is richer and enjoys less is the expected
//                      case, not a surprise
export function surpriseMeasures({ end, reversal, shock }) {
  const money = units("netWorth", Math.abs(end.netWorth));
  return [
    ...KEYS.map((k) => [`reversal:${k}`, units(k, reversal[k])]),
    ...KEYS.map((k) => [`shock:${k}`, shock[k] === null ? 0 : units(k, shock[k])]),
    ...BARS.map((k) => [`quiet-money:${k}`, units(k, Math.abs(end[k])) * Math.max(0, 1 - money)]),
    ...["safety", "freedom"].map((k) => [`trade-off:${k}`, Math.sign(end[k]) === -Math.sign(end.netWorth) ? Math.min(money, units(k, Math.abs(end[k]))) : 0]),
  ];
}

// A score: (features) -> { score, reason }. reason names what scored, for the UI and for tests.
export const SCORES = Object.freeze({
  // The obvious one: the money gap at the end
  "net-worth-gap": ({ end }) => ({ score: units("netWorth", Math.abs(end.netWorth)), reason: "net-worth-gap" }),

  // Something unexpected happened: the largest of surpriseMeasures. The money gap on its own
  // scores nothing. Ties go to the measure listed first
  "surprise": (features) => {
    const [reason, score] = surpriseMeasures(features).reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0]);
    return { score, reason };
  },
});

// Not ruled. scripts/measure-rank.mjs reports what "surprise" surfaces and buries against
// "net-worth-gap"; the ruling is setting this to a name in SCORES.
export const SCORE = null;

// Every fork of the save, in choice order then sheet order:
// [{ monthIndex, decisionId, month, real, option, features, fork }]. fork is fork()'s full
// result, so the UI can show and narrate it without running it again.
// onFork(entry, done, total), when given, is called after each fork: the ghost screen's ranking
// worker reports progress with it.
export function forksOf(save, { onFork = null } = {}) {
  const plan = save.choices.flatMap((_, monthIndex) => alternativesAt(save, monthIndex).map((option) => [monthIndex, option]));
  const forks = [];
  for (const [monthIndex, option] of plan) {
    const result = fork(save, monthIndex, option);
    const decisionId = option.split("-")[0];
    const month = getDecision(decisionId).month;
    const entry = { monthIndex, decisionId, month, real: save.choices[monthIndex], option, features: features(result, month), fork: result };
    forks.push(entry);
    if (onFork) onFork(entry, forks.length, plan.length);
  }
  return forks;
}

// Scores forks and orders them, highest first; ties keep choice order, then sheet order
export function order(forks, score) {
  const scoreFn = typeof score === "string" ? SCORES[score] : score;
  if (typeof scoreFn !== "function") {
    throw new Error(score === null ? "No fork score is ruled yet: pass { score }" : `Unknown fork score ${JSON.stringify(score)}`);
  }
  return forks.map((f) => ({ ...f, ...scoreFn(f.features) })).sort((a, b) => b.score - a.score);
}

// rank(save, { score }) -> forksOf(save), each with { score, reason }, highest score first
export function rank(save, { score = SCORE } = {}) {
  if (typeof score === "string" && !SCORES[score]) throw new Error(`Unknown fork score ${JSON.stringify(score)}`);
  if (score === null) throw new Error("No fork score is ruled yet: pass { score }");
  return order(forksOf(save), score);
}
