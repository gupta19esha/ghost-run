// The section 10.1 tokens as numbers, read from a state that has already reached the moment
// a text shows. No formatting (ENGINE.md rule 2). tokens.js finds that moment for the UI, and
// step 6 of the month uses these to decide whether a callback has any text left.

import CONSTANTS from "./constants.js";
import DECISIONS from "./decisions.js";
import { explainSafety, explainFreedom, savedTotal } from "./bars.js";

export const TOKENS = [
  "equity_balance",
  "equity_change_pct",
  "equity_down_months",
  "equity_contributed",
  "total_saved",
  "retirement_balance",
  "monthly_costs",
  "minimum_month",
  "gold_change_pct",
  "stopped_monthly",
];

const TOKEN_PATTERN = /\{([a-z_]+)\}/g;

export function tokensIn(template) {
  return [...(template || "").matchAll(TOKEN_PATTERN)].map((m) => m[1]);
}

// A sentence ends at a full stop, question mark or exclamation mark followed by a space, so
// "3.5%" and "5.8 LPA" stay whole. text/ splits the copy with this same function.
export function splitSentences(template) {
  return (template || "").trim().split(/(?<=[.?!])\s+/).filter((s) => s.length > 0);
}

export function isUnavailable(value) {
  return value === null || value === undefined;
}

// Section 10 rule 28: true when every sentence holds a token with no value, so nothing shows
export function nothingLeft(template, values) {
  return splitSentences(template).every((sentence) => tokensIn(sentence).some((name) => isUnavailable(values[name])));
}

// True when some values could empty the text: every sentence holds a token
export function canEmpty(template) {
  const sentences = splitSentences(template);
  return sentences.length > 0 && sentences.every((sentence) => tokensIn(sentence).length > 0);
}

const MARKET_BUCKETS = { equity: ["equity", "small_cap"], gold: ["gold"] };

function holdingOf(state, kind, owner) {
  if (!owner) return null;
  for (const bucket of MARKET_BUCKETS[kind]) {
    const holding = state[bucket].find((h) => h.opened_by === owner);
    if (holding) return holding;
  }
  return null;
}

// Balance against money put in, over the holding's life up to the month the text shows.
// A month is down when the gain on money put in fell, which removes that month's new money.
function holdingFigures(holding) {
  if (!holding || holding.history.length === 0 || holding.contributed <= 0) {
    return { balance: null, contributed: null, change: null, down_months: null };
  }
  const last = holding.history.at(-1);
  let gain = 0;
  let down_months = 0;
  for (const entry of holding.history) {
    const next = entry.value - entry.contributed;
    if (next < gain) down_months += 1;
    gain = next;
  }
  return {
    balance: last.value,
    contributed: last.contributed,
    change: (last.value - last.contributed) / last.contributed,
    down_months,
  };
}

// {stopped_monthly}: the monthly saving the owner option paused, summed over the saving
// commitments of its modifies_commitment targets that are paused at the moment the text shows.
// D28-B's result: 5,000 for D16's investment, 12,000 for D27-B's, 6,000 for D27-C's invested
// half, or their sum. Null for any option that pauses nothing.
function stoppedMonthly(view, owner, decisions) {
  if (!owner) return null;
  const option = decisions[owner.split("-")[0]]?.options[owner];
  const targets = option?.modifies_commitment || [];
  if (targets.length === 0) return null;
  const paused = view.commitments.filter((c) => c.kind === "saving" && targets.includes(c.opened_by) && c.paused_months > 0);
  return paused.length > 0 ? paused.reduce((total, c) => total - c.amount, 0) : null;
}

// view: the state at the moment the text shows. owner: the option whose holding the tokens
// read. savedFrom: the decision {total_saved} counts from, or null.
export function readTokens(view, { owner, savedFrom }, constants = CONSTANTS, decisions = DECISIONS) {
  const equity = holdingFigures(holdingOf(view, "equity", owner));
  const gold = holdingFigures(holdingOf(view, "gold", owner));
  const safety = explainSafety(view, constants);
  const freedom = explainFreedom(view, constants);
  const before = savedFrom ? view.saved_before[savedFrom] : undefined;
  const saved = before === undefined ? null : savedTotal(view) - before;

  return {
    equity_balance: equity.balance,
    equity_change_pct: equity.change,
    equity_down_months: equity.down_months,
    equity_contributed: equity.contributed,
    total_saved: saved !== null && saved > 0 ? saved : null,
    retirement_balance: view.retirement_fund,
    monthly_costs: view.costs.living_costs + freedom.cost_commitments + freedom.debt_minimums,
    minimum_month: safety.essential_burn,
    gold_change_pct: gold.change,
    stopped_monthly: stoppedMonthly(view, owner, decisions),
  };
}

export function deferredTemplate(callback, decisions = DECISIONS) {
  return decisions[callback.decision_id].options[callback.opened_by].deferred_text;
}
