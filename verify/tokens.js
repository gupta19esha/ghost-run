// The tokens a narration of a fork may use, as raw values read from what fork() returns. The same
// mechanism as the engine's section 10.1 tokens (engine/token-figures.js): a fixed list of
// {snake_case} names, each resolved to a number or a sheet label, and null when the run cannot
// give it. Nothing here formats (ENGINE.md rule 2): verify/render.js turns values into words.
//
// Every value comes from the fork result: { real, ghost, divergence, substitutions }. The fork
// point is not stored there, so it is found as the first choice where the two runs differ.
// Substitutions only ever come after the fork, so that first difference is the fork itself. A fork
// that takes the player's own option differs nowhere: the fork tokens are null, and the ghost is
// the real run.

import { getDecision } from "../vendor/dry-run-engine/engine/index.js";
import { shownMoneyGap } from "./render.js";

export const TOKENS = [
  // The fork point
  "fork_decision",
  "fork_month",
  "real_choice",
  "ghost_choice",
  // The last month both runs closed, and each run's figures there
  "end_month",
  "real_net_worth",
  "ghost_net_worth",
  "real_safety",
  "ghost_safety",
  "real_freedom",
  "ghost_freedom",
  "real_life",
  "ghost_life",
  // Ghost minus real at end_month
  "net_worth_gap",
  "safety_gap",
  "freedom_gap",
  "life_gap",
  // How long the two runs stayed the same
  "identical_months",
  "first_divergent_month",
  // Later real choices the ghost could not take (rule 29), and what it took instead
  "substitution_count",
  "substituted_decision",
  "substitution_month",
  "withdrawn_choice",
  "substitute_choice",
  // What happened between the split and the end. Net worth gaps are as displayed
  "widest_gap_month",
  "widest_gap",
  "ghost_ahead_months",
  "first_bar_apart_month",
  "first_bar_apart",
  "ghost_lowest_month",
  "layoff_month",
  "layoff_real_net_worth",
  "layoff_ghost_net_worth",
  "layoff_net_worth_gap",
  "crossover_month",
  "crossover_count",
];

// The tokens that describe a substitution. A narration of a fork with substitutions must use one
// of them where it says the choice was unavailable (verify/verify.js).
export const SUBSTITUTION_TOKENS = ["substitution_count", "substituted_decision", "substitution_month", "withdrawn_choice", "substitute_choice"];

const BARS = { net_worth: "netWorth", safety: "safety", freedom: "freedom", life: "life" };
const BAR_LABELS = [["safety", "Safety"], ["freedom", "Freedom"], ["life", "Life"]];

// Option ids carry their decision: D16-A is an option of D16
const decisionOf = (optionId) => optionId.split("-")[0];
const optionLabel = (optionId) => (optionId ? getDecision(decisionOf(optionId)).options[optionId].option_label : null);

// The first choice where the runs differ, or null when they never do
function forkPoint(real, ghost) {
  const index = real.choices.findIndex((id, i) => ghost.choices[i] !== undefined && ghost.choices[i] !== id);
  if (index < 0) return null;
  return { decisionId: decisionOf(real.choices[index]), real: real.choices[index], ghost: ghost.choices[index] };
}

// A month is identical when both runs wrote the same history row for it and no bar differs
function identicalMonths({ real, ghost, divergence }) {
  let months = 0;
  for (const row of divergence) {
    const same = Object.values(BARS).every((k) => row[k] === 0) &&
      JSON.stringify(real.history.find((h) => h.month === row.month)) === JSON.stringify(ghost.history.find((h) => h.month === row.month));
    if (!same) break;
    months += 1;
  }
  return months;
}

// The middle of the run, over the months both runs closed. Each is null when the run has none
function events({ real, ghost, divergence }, splitMonth) {
  const row = (run, month) => run.bars.find((b) => b.month === month);
  const gaps = divergence.map(({ month }) => ({ month, gap: shownMoneyGap(row(real, month).netWorth, row(ghost, month).netWorth) }));

  // Ties go to the earliest month
  const widest = gaps.reduce((best, g) => (Math.abs(g.gap) > Math.abs(best?.gap ?? 0) ? g : best), null);
  const ahead = gaps.filter((g) => g.gap > 0).length;

  // Apart as displayed, in whole points. Bars that part in the same month: the one furthest apart
  const barGap = (month, key) => Math.abs(Math.round(row(ghost, month)[key]) - Math.round(row(real, month)[key]));
  const barApart = gaps.find(({ month }) => BAR_LABELS.some(([key]) => barGap(month, key) > 0));
  const firstBar = barApart && BAR_LABELS.reduce((best, bar) => (barGap(barApart.month, bar[0]) > barGap(barApart.month, best[0]) ? bar : best));

  // After the split only: over the whole run it would nearly always be month 1
  const lowest = splitMonth === null ? null : gaps.filter(({ month }) => month > splitMonth)
    .reduce((best, { month }) => (!best || row(ghost, month).netWorth < row(ghost, best).netWorth ? month : best), null);

  // A month the ghost's lead changes hands: the gap's sign flips, across any months at level
  const crossings = [];
  let side = 0;
  for (const { month, gap } of gaps) {
    if (gap !== 0 && side !== 0 && Math.sign(gap) !== side) crossings.push(month);
    if (gap !== 0) side = Math.sign(gap);
  }

  // The layoff is scripted (the sheet's shock column, read by engine/shocks.js) and is the only
  // scripted shock. It is an event only if both runs were laid off that month and reached it
  const laidOff = real.state.employment.laid_off_month ?? null;
  const layoff = laidOff !== null && ghost.state.employment.laid_off_month === laidOff && gaps.some((g) => g.month === laidOff) ? laidOff : null;

  return {
    widest_gap_month: widest?.month ?? null,
    widest_gap: widest?.gap ?? null,
    ghost_ahead_months: ahead > 0 ? ahead : null,
    first_bar_apart_month: barApart?.month ?? null,
    first_bar_apart: firstBar?.[1] ?? null,
    ghost_lowest_month: lowest,
    layoff_month: layoff,
    layoff_real_net_worth: layoff === null ? null : row(real, layoff).netWorth,
    layoff_ghost_net_worth: layoff === null ? null : row(ghost, layoff).netWorth,
    layoff_net_worth_gap: layoff === null ? null : shownMoneyGap(row(real, layoff).netWorth, row(ghost, layoff).netWorth),
    crossover_month: crossings[0] ?? null,
    crossover_count: crossings.length > 0 ? crossings.length : null,
  };
}

export function resolveTokens(forkResult) {
  const { real, ghost, divergence, substitutions } = forkResult;
  const point = forkPoint(real, ghost);
  const end = divergence.at(-1) ?? null;
  const at = (run) => (end ? run.bars.find((b) => b.month === end.month) : null);
  const realEnd = at(real);
  const ghostEnd = at(ghost);
  const identical = identicalMonths(forkResult);
  const first = substitutions[0] ?? null;

  const values = {
    fork_decision: point?.decisionId ?? null,
    fork_month: point ? getDecision(point.decisionId).month : null,
    real_choice: point ? optionLabel(point.real) : null,
    ghost_choice: point ? optionLabel(point.ghost) : null,
    end_month: end?.month ?? null,
    identical_months: identical,
    // Null when the runs never differ in any month both closed
    first_divergent_month: identical < divergence.length ? divergence[identical].month : null,
    substitution_count: substitutions.length,
    substituted_decision: first?.decisionId ?? null,
    substitution_month: first ? getDecision(first.decisionId).month : null,
    withdrawn_choice: first ? optionLabel(first.withdrawn) : null,
    // Null when the rule ended the ghost there instead of choosing (keep-real-or-stop)
    substitute_choice: first ? optionLabel(first.chosen) : null,
    ...events(forkResult, point ? getDecision(point.decisionId).month : null),
  };
  for (const [name, key] of Object.entries(BARS)) {
    values[`real_${name}`] = realEnd ? realEnd[key] : null;
    values[`ghost_${name}`] = ghostEnd ? ghostEnd[key] : null;
    values[`${name}_gap`] = end ? end[key] : null;
  }
  return values;
}
