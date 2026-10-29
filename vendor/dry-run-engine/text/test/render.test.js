// ENGINE.md step 6: text tokens, section 10.1. Formats, capitals and the fallback.

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderText, formatRupees, formatExactRupees, formatMoney, formatMonths, formatShare, formatCommitted, formatPercent, formatCount, FORMATS, tokensIn } from "../render.js";
import { TOKENS } from "../../engine/index.js";
import DECISIONS from "../../engine/decisions.js";

test("rupees: Indian grouping, to the nearest 1,000, or 100 below 10,000", () => {
  assert.equal(formatRupees(120000), "1,20,000");
  assert.equal(formatRupees(1234567), "12,35,000");
  assert.equal(formatRupees(34148), "34,000");
  assert.equal(formatRupees(3440), "3,400");
  assert.equal(formatRupees(9960), "10,000");
  assert.equal(formatRupees(999), "1,000");
  assert.equal(formatRupees(40), "0");
});

test("money shown as money: to the rupee, Indian grouping, a true minus sign", () => {
  assert.equal(formatExactRupees(41300), "41,300");
  assert.equal(formatExactRupees(1234567.4), "12,34,567");
  assert.equal(formatExactRupees(999.5), "1,000");
  assert.equal(formatExactRupees(-433505), "−4,33,505");
  assert.equal(formatExactRupees(-0.2), "0");
  assert.equal(formatMoney(41300), "₹41,300");
  assert.equal(formatMoney(-433505), "−₹4,33,505");
  assert.equal(formatMoney(-0.2), "₹0");
});

test("direction and percent, and counts in words", () => {
  assert.equal(formatPercent(0.07), "up 7%");
  assert.equal(formatPercent(-0.2249), "down 22%");
  assert.equal(formatPercent(0.004), "flat");
  assert.equal(formatPercent(-0.004), "flat");
  assert.equal(formatCount(0), "none");
  assert.equal(formatCount(4), "four");
  assert.equal(formatCount(14), "fourteen");
});

test("a token that starts a sentence is capitalised, anywhere in the text", () => {
  assert.equal(
    renderText("{gold_change_pct}. You cannot sell it without a conversation.", { gold_change_pct: -0.05 }),
    "Down 5%. You cannot sell it without a conversation.",
  );
  assert.equal(
    renderText("Fourteen months. {equity_down_months} of them were red.", { equity_down_months: 0 }),
    "Fourteen months. None of them were red.",
  );
  assert.equal(renderText("Your balance is {equity_change_pct}.", { equity_change_pct: 0.12 }), "Your balance is up 12%.");
});

test("an unavailable value drops its sentence, and nothing left means nothing shows", () => {
  const d20 = DECISIONS.D20.situation_text;
  assert.equal(
    renderText(d20, { equity_change_pct: null }),
    "A colleague says he made 40% last year in small companies. He shows you the screen.",
  );
  assert.equal(renderText("{total_saved} saved without ever feeling it leave.", { total_saved: null }), null);
  // Decimals are not sentence ends
  assert.equal(renderText("Interest runs near 3.5% a month. {total_saved} saved.", { total_saved: null }), "Interest runs near 3.5% a month.");
});

test("never a raw token: an unknown token is an error, not printed", () => {
  assert.throws(() => renderText("You have {bank_balance}.", { bank_balance: 5 }), /not a section 10.1 token/);
});

test("the text formats and the engine agree on the token list, and the copy uses no other", () => {
  assert.deepEqual(Object.keys(FORMATS).sort(), [...TOKENS].sort());
  for (const decision of Object.values(DECISIONS)) {
    const fields = [["situation", decision.situation_text]];
    for (const o of Object.values(decision.options)) fields.push([o.option_id, o.option_label], [o.option_id, o.immediate_text], [o.option_id, o.deferred_text]);
    for (const [where, text] of fields) {
      for (const name of tokensIn(text)) assert.ok(FORMATS[name], `${decision.decision_id} ${where} uses {${name}}`);
    }
  }
});

test("months and shares for the bars on Home: one decimal, a plain percent, null with no figure", () => {
  assert.equal(formatMonths(1.2), "1.2 months");
  assert.equal(formatMonths(1.04), "1 month");
  assert.equal(formatMonths(0.17), "0.2 months");
  assert.equal(formatMonths(0), "0 months");
  assert.equal(formatMonths(3), "3 months");
  assert.equal(formatMonths(Infinity), null);
  assert.equal(formatShare(0.22), "22%");
  assert.equal(formatShare(0.3052), "31%");
  assert.equal(formatShare(0), "0%");
  assert.equal(formatShare(Infinity), null);
});

test("the committed line names the last salary while there is none", () => {
  assert.equal(formatCommitted(0.64, false), "64% committed");
  assert.equal(formatCommitted(0.64, true), "64% of your last salary committed");
  assert.equal(formatCommitted(Infinity, true), null);
});
