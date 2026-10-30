// ENGINE.md step 3: applying a decision.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import DECISIONS from "../decisions.js";
import { createState, advanceMonth, applyDecision, getBars, getHistory, optionsFor } from "../index.js";
import { fixedCommitments, applyCallbacks } from "../ledger.js";

const CLOSE = 1e-9;

function show(title, value) {
  const round = (_, v) => (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
  console.log(`\n${title}\n${JSON.stringify(value, round, 2)}`);
}

function atMonth(month) {
  let state = createState(1);
  while (state.month < month) state = advanceMonth(state).state;
  return state;
}

// A state placed at a month without living through the months before it. For unit tests of
// one decision only.
function placedAt(month) {
  const state = createState(1);
  state.month = month;
  return state;
}

test("ENGINE.md: apply D11-C", () => {
  const before = atMonth(DECISIONS.D11.month);
  const { state, effects } = applyDecision(before, "D11", "D11-C");
  show("D11-C effects", effects);

  // Rule 24: an EMI purchase opens a debt paid by the stated EMI, not a monthly cost
  const emi = state.debts.find((d) => d.opened_by === "D11-C");
  assert.ok(emi, "an EMI debt exists");
  assert.equal(emi.payment, 6600, "an EMI of 6,600");
  assert.equal(emi.months_remaining, 12, "with 12 months remaining");
  assert.equal(emi.principal, 73000, "for the phone's cash price");
  assert.equal(emi.starts_month, 7);
  assert.equal(state.commitments.length, 0, "no monthly cost as well");

  const asset = state.assets.find((a) => a.opened_by === "D11-C");
  assert.equal(asset.current_value, 73000, "an asset worth its 73,000 cash price");
  assert.ok(effects.some((e) => e.type === "asset_acquired" && e.asset.current_value === 73000));

  const freedomBefore = getBars(before).freedom;
  const freedomAfter = getBars(state).freedom;
  assert.ok(freedomAfter < freedomBefore, "Freedom has dropped");
  const expected = ((CONSTANTS.FREEDOM_CEILING_RATIO - 6600 / CONSTANTS.SALARY_NET_START) / CONSTANTS.FREEDOM_CEILING_RATIO) * 100;
  assert.ok(Math.abs(freedomAfter - expected) < CLOSE);

  // Equal to the last floating-point digit, not bit for bit: the sums run in a different order
  assert.ok(Math.abs(getBars(state).netWorth - getBars(before).netWorth) < CLOSE, "buying on EMI does not raise net worth");

  const callback = state.pending_callbacks.find((c) => c.opened_by === "D11-C");
  assert.equal(callback.month, 18, "a callback is queued for month 18");

  assert.equal(state.pending_flows.life_effects, 2);
  assert.deepEqual(before.debts, [], "applyDecision does not change the state it is given");
});

test("D11-C's EMI debt is paid months 7 to 18, clears exactly, and its callback lands in month 18", () => {
  let state = applyDecision(atMonth(6), "D11", "D11-C").state;
  const paid = [];
  let total = 0;
  let callbackMonth = null;
  while (state.month <= 19) {
    const month = state.month;
    const result = advanceMonth(state);
    state = result.state;
    const payment = result.events.find((e) => e.type === "debt_paid" && e.opened_by === "D11-C");
    if (payment) {
      paid.push(month);
      total += payment.payment;
    }
    if (result.events.some((e) => e.type === "callback" && e.opened_by === "D11-C")) callbackMonth = month;
  }
  const history = getHistory(state);
  const byMonth = (m) => history.find((h) => h.month === m);
  console.log(`\nD11-C: EMI paid in months ${paid.join(", ")}, total ${total.toFixed(2)}`);
  console.log("Freedom months 6, 17, 18, 19:", [6, 17, 18, 19].map((m) => byMonth(m).freedom.toFixed(1)).join(", "));

  assert.deepEqual(paid, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], "first payment the month after the decision");
  assert.ok(Math.abs(total - 12 * 6600) < 0.01, "twelve payments of 6,600: the stated EMI");
  const hiddenCost = total - 73000;
  console.log(`Hidden cost of the no-cost EMI: ${hiddenCost.toFixed(2)}, ${((hiddenCost / total) * 100).toFixed(2)}% of the EMI total`);
  assert.ok(Math.abs(hiddenCost - 6200) < 0.01, "the cash discount given up");
  assert.equal(Math.round((hiddenCost / total) * 100), Math.round(CONSTANTS.NO_COST_EMI_MARKUP * 100));
  assert.equal(callbackMonth, 18);
  assert.equal(state.debts.length, 0, "the EMI debt cleared");
  // Section 5: the month of the final EMI payment is the month Freedom jumps back
  assert.ok(byMonth(17).freedom < 100, "still committed in month 17");
  assert.equal(byMonth(18).freedom, 100, "Freedom jumps back in month 18, the final payment");
});

test("D11-C's effect on net worth, before and after rule 24", () => {
  const withoutEmiFlag = structuredClone(DECISIONS);
  delete withoutEmiFlag.D11.options["D11-C"].is_emi_purchase;

  const path = (decisions) => {
    let state = atMonth(6);
    if (decisions) state = applyDecision(state, "D11", "D11-C", decisions).state;
    while (state.month <= 24) state = advanceMonth(state).state;
    return getHistory(state);
  };
  const nothing = path(null);
  const before = path(withoutEmiFlag);
  const after = path(DECISIONS);
  const months = [6, 7, 12, 18, 24];
  const diff = (h, m) => Math.round(h.find((x) => x.month === m).net_worth - nothing.find((x) => x.month === m).net_worth);
  const rows = months.map((m) => ({ month: m, "before v16": diff(before, m), "after v16": diff(after, m) }));
  console.log("\nD11-C: net worth compared with a player who kept the old phone");
  console.table(rows);

  assert.equal(diff(before, 6), 73000, "before: buying on EMI raised net worth by the full price");
  assert.ok(diff(after, 6) <= 0, "after: buying on EMI does not raise net worth");
  assert.ok(diff(after, 24) < 0, "after: by month 24 the phone has cost net worth");
});

// A state at the decision's month in which the option is offered (rule 29): with D16-A's
// investment running when the option needs the index or modifies a commitment
function offeringState(decision, option) {
  if (option.requires === "index" || (option.modifies_commitment || []).length > 0) {
    const state = applyDecision(placedAt(DECISIONS.D16.month), "D16", "D16-A").state;
    state.month = decision.month;
    return state;
  }
  return placedAt(decision.month);
}

test("every option in the sheet applies at its month, in a state that offers it", () => {
  const counts = {};
  for (const decision of Object.values(DECISIONS)) {
    for (const option of Object.values(decision.options)) {
      const { effects } = applyDecision(offeringState(decision, option), decision.decision_id, option.option_id);
      for (const e of effects) counts[e.type] = (counts[e.type] || 0) + 1;
    }
  }
  show("Effect types across all 126 options", counts);
  // Chapter 1's 95, and the 31 of chapter 2's opening, months 25 to 30 (sheets v35 and v36)
  const optionsIn = (chapter) => Object.values(DECISIONS).filter((d) => d.chapter === chapter).reduce((n, d) => n + Object.keys(d.options).length, 0);
  assert.equal(optionsIn(1), 95);
  assert.equal(optionsIn(2), 31);
  assert.equal(Object.values(DECISIONS).reduce((n, d) => n + Object.keys(d.options).length, 0), 126);
});

test("rule 29: an option whose precondition fails is not offered, and cannot be chosen", () => {
  const blank = placedAt(DECISIONS.D20.month);
  assert.deepEqual(optionsFor(blank, DECISIONS.D20), ["D20-C", "D20-D"], "no index: ignore it, or start small caps");
  assert.throws(() => applyDecision(blank, "D20", "D20-A"), /not offered/);
  const investor = offeringState(DECISIONS.D20, DECISIONS.D20.options["D20-A"]);
  assert.deepEqual(optionsFor(investor, DECISIONS.D20), ["D20-A", "D20-B", "D20-C"], "with the index: D20-D is not offered");
  // D28-B stops any running monthly investment, D27's included
  const noInvestment = placedAt(DECISIONS.D28.month);
  assert.ok(!optionsFor(noInvestment, DECISIONS.D28).includes("D28-B"));
  let d27 = applyDecision(placedAt(DECISIONS.D27.month), "D27", "D27-B").state;
  d27.month = DECISIONS.D28.month;
  assert.ok(optionsFor(d27, DECISIONS.D28).includes("D28-B"));
  d27 = applyDecision(d27, "D28", "D28-B").state;
  assert.equal(d27.commitments.find((c) => c.opened_by === "D27-B").paused_months, 4, "the D27 investment pauses");
  // D27-C opens an investment and a spending half: D28-B pauses the investment only
  let split = applyDecision(placedAt(DECISIONS.D27.month), "D27", "D27-C").state;
  split.month = DECISIONS.D28.month;
  split = applyDecision(split, "D28", "D28-B").state;
  const halves = split.commitments.filter((c) => c.opened_by === "D27-C");
  assert.equal(halves.find((c) => c.kind === "saving").paused_months, 4);
  assert.ok(!(halves.find((c) => c.kind === "cost").paused_months > 0), "the comfort half keeps being spent");
});

test("split money: D15-B puts 20,000 in gold and 40,000 in equity", () => {
  const { state } = applyDecision(placedAt(9), "D15", "D15-B");
  assert.equal(state.cash, CONSTANTS.NET_WORTH_START - 60000);
  assert.deepEqual(state.gold.map((h) => [h.opened_by, h.value]), [["D15-B", 20000]]);
  assert.deepEqual(state.equity.map((h) => [h.opened_by, h.value]), [["D15-B", 40000]]);
  assert.equal(state.pending_flows.cash_out, 60000);
});

test("income event: D14-B's bonus arrives, then half the fee is spent and the rest invested", () => {
  const { state, effects } = applyDecision(placedAt(9), "D14", "D14-B");
  show("D14-B effects", effects);
  assert.equal(state.cash, CONSTANTS.NET_WORTH_START + 120000 - 40000 - 80000);
  assert.equal(state.equity[0].value, 80000);
  assert.equal(state.pending_flows.cash_in, 120000);
  assert.equal(state.pending_flows.cash_out, 120000);
});

test("cover and a premium: D09-A adds 5 lakhs of health cover and a 450 cost", () => {
  const { state } = applyDecision(placedAt(5), "D09", "D09-A");
  assert.equal(state.cover.health_cover, CONSTANTS.HEALTH_COVER_START + 500000);
  assert.equal(state.commitments[0].amount, -450);
  assert.equal(state.commitments[0].kind, "cost");
});

test("rule 17: D20-A redirects D16-A to small caps, D28-B pauses it for 4 months", () => {
  let state = applyDecision(placedAt(10), "D16", "D16-A").state;
  state.month = 14;
  const redirect = applyDecision(state, "D20", "D20-A");
  state = redirect.state;
  const sip = state.commitments.find((c) => c.opened_by === "D16-A");
  assert.equal(sip.destination, "small_cap");
  assert.equal(sip.holding_opened_by, "D20-A");

  state.month = 22;
  state = applyDecision(state, "D28", "D28-B").state;
  assert.equal(state.commitments.find((c) => c.opened_by === "D16-A").paused_months, 4);

  // Step 3 on its own: four paused months, then a payment into the small cap holding D20-A opened
  const paidMonths = [];
  for (let month = 22; month <= 27; month++) {
    state.month = month;
    const events = [];
    fixedCommitments(state, CONSTANTS, events);
    if (events.some((e) => e.type === "money_moved" && e.source === "D16-A")) paidMonths.push(month);
  }
  assert.deepEqual(paidMonths, [26, 27]);
  assert.deepEqual(state.small_cap.map((h) => [h.opened_by, h.value]), [["D20-A", 10000]]);

  // With no monthly investment running, D28-B is not offered at all (rule 29)
  assert.throws(() => applyDecision(placedAt(22), "D28", "D28-B"), /not offered/);
});

test("deferred one-offs hit their bucket: D07-D's leak from cash at home, D30-A's write-off", () => {
  let state = applyDecision(placedAt(4), "D07", "D07-D").state;
  assert.equal(state.cash_at_home, 20000);
  state.month = 16;
  const homeEvents = [];
  applyCallbacks(state, CONSTANTS, homeEvents);
  assert.equal(state.cash_at_home, 16000, "the -4,000 comes out of the cash at home, not cash");

  let scheme = applyDecision(placedAt(24), "D30", "D30-A").state;
  assert.equal(scheme.equity[0].value, 50000);
  const payout = scheme.commitments.find((c) => c.opened_by === "D30-A");
  assert.equal(payout.amount, 3000);
  assert.equal(payout.kind, "income");
  scheme.month = 30;
  const events = [];
  applyCallbacks(scheme, CONSTANTS, events);
  show("D30-A callback events", events);
  assert.equal(scheme.equity[0].value, 0, "the scheme balance is written off, not taken from cash");
  assert.equal(scheme.cash, CONSTANTS.NET_WORTH_START - 50000, "cash only paid the original 50,000");
  assert.ok(scheme.commitments.some((c) => c.opened_by === "D30-A" && c.amount === -3000), "the payout stop is queued");
});

test("a decision must be made in its month, once", () => {
  assert.throws(() => applyDecision(placedAt(5), "D11", "D11-C"), /month 6 decision/);
  const once = applyDecision(placedAt(6), "D11", "D11-A").state;
  assert.throws(() => applyDecision(once, "D11", "D11-C"), /already decided/);
  assert.throws(() => applyDecision(placedAt(6), "D11", "D12-A"), /not an option/);
});

test("rule 21: rent starts the month you move in, other monthly money the month after", () => {
  let state = applyDecision(createState(1), "D02", "D02-B").state;
  const month1 = advanceMonth(state);
  assert.ok(month1.events.some((e) => e.type === "money_moved" && e.source === "D02-B" && e.amount === -9000), "rent paid in month 1");

  const emi = applyDecision(atMonth(6), "D11", "D11-C");
  assert.equal(emi.state.debts[0].starts_month, 7);
  const rent = applyDecision(placedAt(18), "D24", "D24-A");
  assert.equal(rent.state.commitments[0].starts_month, 18);
});

test("rule 22: a phone depreciates to its floor, a deposit does not", () => {
  let state = applyDecision(createState(1), "D02", "D02-B").state;
  while (state.month < 6) state = advanceMonth(state).state;
  state = applyDecision(state, "D11", "D11-B").state;
  const values = {};
  while (state.month <= 40) {
    state = advanceMonth(state).state;
    const phone = state.assets.find((a) => a.opened_by === "D11-B");
    values[state.month - 1] = phone.current_value;
  }
  console.log("\nD11-B phone value by month:", [6, 7, 11, 18, 30, 40].map((m) => `${m}: ${values[m]}`).join(", "));
  assert.equal(values[6], 18000, "full price in the month bought");
  assert.equal(values[11], 18000 * (1 - CONSTANTS.PHONE_DEPRECIATION_ANNUAL * 5 / 12));
  assert.equal(values[40], 18000 * CONSTANTS.PHONE_VALUE_FLOOR, "down to the floor");
  const deposit = state.assets.find((a) => a.opened_by === "D02-B");
  assert.equal(deposit.asset_type, "deposit");
  assert.equal(deposit.current_value, 12000, "a deposit does not depreciate");
});

test("rule 23: D07-B's one year FD matures at month 16, and its month 22 callback charges nothing", () => {
  let state = applyDecision(atMonth(4), "D07", "D07-B").state;
  assert.equal(state.fds[0].maturity_month, 16);
  let maturedMonth = null;
  let matured = 0;
  let callback = null;
  let callbackMoney = [];
  while (state.month <= 22) {
    const month = state.month;
    const result = advanceMonth(state);
    state = result.state;
    const maturity = result.events.find((e) => e.type === "fd_matured");
    if (maturity) {
      maturedMonth = month;
      matured = maturity.amount;
    }
    if (result.events.some((e) => e.type === "callback" && e.opened_by === "D07-B")) {
      callback = month;
      callbackMoney = result.events.filter((e) => e.type === "deferred_money" && e.source === "D07-B");
    }
  }
  console.log(`\nD07-B: matured at month ${maturedMonth} for ${matured.toFixed(2)}, callback at month ${callback}`);
  assert.equal(maturedMonth, 16, "twelve months after the month 4 decision, as the copy states");
  let twelveMonths = 20000;
  for (let i = 0; i < 12; i++) twelveMonths += twelveMonths * CONSTANTS.FD_ANNUAL_RATE / 12; // the engine's form
  assert.equal(matured, twelveMonths, "exactly twelve months of interest");
  assert.deepEqual(state.fds, []);
  assert.equal(callback, 22);
  assert.deepEqual(callbackMoney, [], "no penalty to charge");
});

test("rule 19: a deferred removal larger than the bucket is capped and reports the shortfall", () => {
  const state = applyDecision(placedAt(4), "D07", "D07-D").state;
  state.cash_at_home = 1000;
  state.month = 16;
  const events = [];
  applyCallbacks(state, CONSTANTS, events);
  const leak = events.find((e) => e.type === "deferred_money");
  show("D07-D callback with only 1,000 at home", leak);
  assert.equal(leak.amount, -4000);
  assert.equal(leak.applied, -1000);
  assert.equal(leak.shortfall, -3000);
  assert.equal(state.cash_at_home, 0);
});

test("locked_long split: EPF, endowment and tax product land in their own balances", () => {
  const epf = applyDecision(placedAt(1), "D01", "D01-C").state;
  assert.equal(epf.commitments[0].destination, "retirement");

  let endowment = applyDecision(placedAt(3), "D05", "D05-A").state;
  endowment.cash = 1000000;
  for (const month of [4, 5]) {
    endowment.month = month;
    endowment.flows = { ...endowment.flows, cash_in: 0, cash_out: 0 };
    fixedCommitments(endowment, CONSTANTS, []);
  }
  assert.equal(endowment.endowment_balance, 6000);
  assert.equal(endowment.retirement_fund, 0, "the endowment no longer pools into retirement");

  const tax = applyDecision(placedAt(12), "D18", "D18-A").state;
  assert.equal(tax.tax_product_balance, 50000);
  assert.equal(tax.retirement_fund, 0);
  assert.equal(tax.pending_callbacks[0].def_monthly_destination, "tax_product");
});

test("rule 20: a paused commitment counts toward nothing", () => {
  let state = applyDecision(placedAt(10), "D16", "D16-B").state;
  const committed = getBars(state).freedom;
  state.month = 22;
  state = applyDecision(state, "D28", "D28-B").state;
  assert.ok(committed < 100, "the RD is committed");
  assert.equal(getBars(state).freedom, 100, "paused, it counts toward nothing");
});
