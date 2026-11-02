// Fills a verified narration with its figures. The only place fork figures are formatted: the
// engine and verify/tokens.js give raw values (ENGINE.md rule 2), and this turns them into words,
// in the same styles text/render.js uses for the game's copy.
//
// renderNarration(narration, verification) -> the final text. verification is what
// verify(narration, forkResult) returned for this narration; the text filled in is its figures',
// so the text shows exactly what was checked. A narration that did not pass is refused.
//
// One displayed value per figure, here and on every screen of the ghost flow: net worth to the
// rupee, as formatMoney shows it, and bars in whole points. A gap is the difference of the two
// displayed values, never the rounded difference of the raw ones, so a reader can do the sum (rule
// 16). printTokens(values) -> what each token prints for one fork. FORMATS formats one value alone,
// for a figure on its way there.

import { formatExactRupees, formatCount } from "../vendor/dry-run-engine/text/render.js";
import { splitSentences, isUnavailable } from "../vendor/dry-run-engine/engine/token-figures.js";

// A month number: the narration writes "month {fork_month}"
const month = (n) => String(n);
// A sheet label, quoted as the player saw it on the decision screen
const label = (text) => `“${text}”`;
// A bar, 0 to 100, as whole points
const points = (n) => String(Math.round(n));

export const ZERO_GAP = "the same as you";
const gapWords = (text, gap) => {
  if (text === "0") return ZERO_GAP;
  return gap > 0 ? `${text} more` : `${text} less`;
};

// Ghost minus real, from the ghost's side: "16,000 less", "4,200 more", "the same as you"
const moneyGap = (gap) => gapWords(formatExactRupees(Math.abs(gap)), gap);

// The difference of two net worths as displayed, a number and in words
export const shownMoneyGap = (from, to) => Math.round(to) - Math.round(from);
export const exactMoneyGap = (real, ghost) => moneyGap(shownMoneyGap(real, ghost));

// Ghost minus real on a bar: "4 points higher", "1 point lower", "level"
function barGap(gap) {
  const n = Math.round(Math.abs(gap));
  if (n === 0) return "level";
  return `${n} ${n === 1 ? "point" : "points"} ${gap > 0 ? "higher" : "lower"}`;
}

export const FORMATS = {
  fork_decision: String,
  fork_month: month,
  real_choice: label,
  ghost_choice: label,
  end_month: month,
  real_net_worth: formatExactRupees,
  ghost_net_worth: formatExactRupees,
  real_safety: points,
  ghost_safety: points,
  real_freedom: points,
  ghost_freedom: points,
  real_life: points,
  ghost_life: points,
  net_worth_gap: moneyGap,
  safety_gap: barGap,
  freedom_gap: barGap,
  life_gap: barGap,
  identical_months: formatCount,
  first_divergent_month: month,
  substitution_count: formatCount,
  substituted_decision: String,
  substitution_month: month,
  withdrawn_choice: label,
  substitute_choice: label,
  widest_gap_month: month,
  widest_gap: moneyGap,
  ghost_ahead_months: formatCount,
  first_bar_apart_month: month,
  first_bar_apart: String,
  ghost_lowest_month: month,
  layoff_month: month,
  layoff_real_net_worth: formatExactRupees,
  layoff_ghost_net_worth: formatExactRupees,
  layoff_net_worth_gap: moneyGap,
  crossover_month: month,
  crossover_count: formatCount,
};

export function printTokens(values) {
  const printed = {};
  for (const [name, format] of Object.entries(FORMATS)) {
    if (!isUnavailable(values[name])) printed[name] = format(values[name]);
  }
  if (!isUnavailable(values.real_net_worth) && !isUnavailable(values.ghost_net_worth)) {
    printed.net_worth_gap = exactMoneyGap(values.real_net_worth, values.ghost_net_worth);
  }
  for (const bar of ["safety", "freedom", "life"]) {
    const [real, ghost] = [values[`real_${bar}`], values[`ghost_${bar}`]];
    if (!isUnavailable(real) && !isUnavailable(ghost)) printed[`${bar}_gap`] = barGap(Math.round(ghost) - Math.round(real));
  }
  return printed;
}

const TOKEN = /\{([a-z_]+)\}/g;

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function renderNarration(narration, verification) {
  if (!verification?.ok) throw new Error("Only a narration that passed verify can be rendered");
  const printed = Object.fromEntries(verification.figures.map(({ token, text }) => [token, text]));
  // A sentence that starts with a token starts with a capital, as in the game's copy
  return splitSentences(narration).map((sentence) => sentence.replace(TOKEN, (match, name, offset) => {
    if (!(name in printed)) throw new Error(`{${name}} was not among the verified figures`);
    const text = printed[name];
    return offset === 0 ? capitalise(text) : text;
  })).join(" ");
}
