// Fills a verified narration with its figures. The only place fork figures are formatted: the
// engine and verify/tokens.js give raw values (ENGINE.md rule 2), and this turns them into words,
// in the same styles text/render.js uses for the game's copy.
//
// renderNarration(narration, verification) -> the final text. verification is what
// verify(narration, forkResult) returned for this narration; the values filled in are its figures,
// so the text shows exactly what was checked. A narration that did not pass is refused.

import { formatRupees, formatCount } from "../vendor/dry-run-engine/text/render.js";
import { splitSentences } from "../vendor/dry-run-engine/engine/token-figures.js";

// A month number: the narration writes "month {fork_month}"
const month = (n) => String(n);
// A sheet label, quoted as the player saw it on the decision screen
const label = (text) => `“${text}”`;
// A bar, 0 to 100, as whole points
const points = (n) => String(Math.round(n));

// Ghost minus real, from the ghost's side: "16,000 less", "4,200 more", "the same"
function moneyGap(gap) {
  const text = formatRupees(Math.abs(gap));
  if (text === "0") return "the same";
  return gap > 0 ? `${text} more` : `${text} less`;
}

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
  real_net_worth: formatRupees,
  ghost_net_worth: formatRupees,
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
};

const TOKEN = /\{([a-z_]+)\}/g;

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function renderNarration(narration, verification) {
  if (!verification?.ok) throw new Error("Only a narration that passed verify can be rendered");
  const values = Object.fromEntries(verification.figures.map(({ token, value }) => [token, value]));
  // A sentence that starts with a token starts with a capital, as in the game's copy
  return splitSentences(narration).map((sentence) => sentence.replace(TOKEN, (match, name, offset) => {
    if (!(name in values)) throw new Error(`{${name}} was not among the verified figures`);
    const text = FORMATS[name](values[name]);
    return offset === 0 ? capitalise(text) : text;
  })).join(" ");
}
