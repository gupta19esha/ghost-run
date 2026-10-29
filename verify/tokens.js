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
];

// The tokens that describe a substitution. A narration of a fork with substitutions must use one
// of them where it says the choice was unavailable (verify/verify.js).
export const SUBSTITUTION_TOKENS = ["substitution_count", "substituted_decision", "substitution_month", "withdrawn_choice", "substitute_choice"];

const BARS = { net_worth: "netWorth", safety: "safety", freedom: "freedom", life: "life" };

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
  };
  for (const [name, key] of Object.entries(BARS)) {
    values[`real_${name}`] = realEnd ? realEnd[key] : null;
    values[`ghost_${name}`] = ghostEnd ? ghostEnd[key] : null;
    values[`${name}_gap`] = end ? end[key] : null;
  }
  return values;
}
