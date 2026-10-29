// Fills the section 10.1 tokens in the copy. The engine gives raw numbers (engine/tokens.js)
// and never formats them (ENGINE.md rule 2). This module is the one place that does.
//
// renderText(template, values) returns the text with every token filled, or null when
// nothing is left: a deferred text with nothing left does not show, an immediate text with
// nothing left is skipped.

const RUPEE_SMALL_BELOW = 10000;
const RUPEE_STEP = 1000;
const RUPEE_SMALL_STEP = 100;

const COUNT_WORDS = [
  "none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];

// Rupees: Indian grouping, to the nearest 1,000, or the nearest 100 below 10,000
export function formatRupees(amount) {
  const step = Math.abs(amount) < RUPEE_SMALL_BELOW ? RUPEE_SMALL_STEP : RUPEE_STEP;
  const rounded = Math.round(Math.abs(amount) / step) * step;
  const digits = String(rounded);
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = rest ? `${rest},${lastThree}` : lastThree;
  return amount < 0 && rounded > 0 ? `-${grouped}` : grouped;
}

// Money shown as money, outside the copy: Indian grouping, to the rupee. A negative amount
// takes a true minus sign. The copy's own figures use formatRupees, which rounds.
export function formatExactRupees(amount) {
  const rounded = Math.round(Math.abs(amount));
  const digits = String(rounded);
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = rest ? `${rest},${lastThree}` : lastThree;
  return amount < 0 && rounded > 0 ? `−${grouped}` : grouped;
}

// Money as the player reads it on screen: the rupee sign, then formatExactRupees. A negative
// amount puts the minus before the sign, "−₹4,33,505".
export function formatMoney(amount) {
  const exact = formatExactRupees(amount);
  return exact.startsWith("−") ? `−₹${exact.slice(1)}` : `₹${exact}`;
}

// A span of months to one decimal: "1.2 months", "1 month", "3 months". Safety's runway on
// Home. Null when there is no finite figure, such as runway with nothing to spend.
export function formatMonths(months) {
  if (!Number.isFinite(months)) return null;
  const rounded = Math.round(months * 10) / 10;
  if (rounded === 1) return "1 month";
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} months`;
}

// A share as a plain percent, no direction: 0.22 is "22%". Freedom's committed share on
// Home. Null when there is no finite figure, such as a share of no income.
export function formatShare(ratio) {
  if (!Number.isFinite(ratio)) return null;
  return `${Math.round(ratio * 100)}%`;
}

// The line beside Freedom on Home and the chapter report: "64% committed". While there is no
// salary the engine measures the share against the last salary earned, and the line says so:
// "64% of your last salary committed" (the product owner's wording, ruled 27 September 2026).
// Null when there is no finite share.
export function formatCommitted(ratio, againstLastSalary) {
  const share = formatShare(ratio);
  if (share === null) return null;
  return againstLastSalary ? `${share} of your last salary committed` : `${share} committed`;
}

// Direction and percent: "up 7%", "down 22%", or "flat" when it rounds to 0
export function formatPercent(change) {
  const percent = Math.round(change * 100);
  if (percent === 0) return "flat";
  return percent > 0 ? `up ${percent}%` : `down ${-percent}%`;
}

// Number in words, "none" when 0
export function formatCount(count) {
  if (!Number.isInteger(count) || count < 0) throw new Error(`A count must be a whole number, got ${count}`);
  return count < COUNT_WORDS.length ? COUNT_WORDS[count] : String(count);
}

export const FORMATS = {
  equity_balance: formatRupees,
  equity_change_pct: formatPercent,
  equity_down_months: formatCount,
  equity_contributed: formatRupees,
  total_saved: formatRupees,
  retirement_balance: formatRupees,
  monthly_costs: formatRupees,
  minimum_month: formatRupees,
  gold_change_pct: formatPercent,
  stopped_monthly: formatRupees,
};

import { tokensIn, splitSentences, isUnavailable } from "../engine/token-figures.js";

export { tokensIn };

const TOKEN = /\{([a-z_]+)\}/g;

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function renderText(template, values) {
  if (template === null || template === undefined) return null;
  for (const name of tokensIn(template)) {
    if (!FORMATS[name]) throw new Error(`{${name}} is not a section 10.1 token`);
  }
  // Sentences split exactly as the engine splits them for rule 28, so a callback the engine
  // lets land always has text here
  const kept = [];
  for (const sentence of splitSentences(template)) {
    const names = tokensIn(sentence);
    if (names.some((name) => isUnavailable(values[name]))) continue;
    // A token that starts the sentence is capitalised: "Down 22%."
    kept.push(sentence.replace(TOKEN, (match, name, offset) => {
      const text = FORMATS[name](values[name]);
      return offset === 0 ? capitalise(text) : text;
    }));
  }
  return kept.length > 0 ? kept.join(" ") : null;
}
