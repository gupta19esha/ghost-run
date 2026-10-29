// ENGINE.md step 4: returns and debt.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import MARKET_SCRIPT from "../market-script.js";
import { createState, advanceMonth, getHistory } from "../index.js";
import { gaussian, monthlyReturn, explainMonthlyReturn } from "../market.js";
import { scheduledPayment, monthlyRate } from "../debt.js";

const SEEDS = 200;

function holding(opened_by, value) {
  return { opened_by, month_opened: 1, value, contributed: value, history: [] };
}

// Market tests are about returns, not the layoff. A funded player never needs the cascade, so
// their investments are never sold to cover the months with no salary.
function funded(state) {
  state.cash = 1e9;
  return state;
}

function run(state, months) {
  for (let i = 0; i < months; i++) state = advanceMonth(state).state;
  return state;
}

function monthlySip(startsMonth) {
  const state = funded(createState(1));
  state.commitments.push({
    amount: -5000, months_remaining: 0, destination: "equity", opened_by: `SIP-${startsMonth}`,
    holding_opened_by: `SIP-${startsMonth}`, kind: "saving", opened_month: startsMonth,
    starts_month: startsMonth, term_months: null, paused_months: 0,
  });
  return state;
}

test("ENGINE.md: the same seed twice produces identical output", () => {
  const build = (seed) => {
    const s = funded(createState(seed));
    s.equity.push(holding("E", 100000));
    s.small_cap.push(holding("S", 50000));
    s.gold.push(holding("G", 30000));
    s.liquid_fund = 20000;
    return run(s, 36);
  };
  const a = build(7);
  const b = build(7);
  assert.deepEqual(getHistory(a), getHistory(b));
  assert.deepEqual([a.equity, a.small_cap, a.gold, a.liquid_fund], [b.equity, b.small_cap, b.gold, b.liquid_fund]);

  const c = build(8);
  assert.notDeepEqual(c.equity[0].history, a.equity[0].history, "a different seed gives a different market");
});

test("ENGINE.md: 5,000 a month from month 10 is worth more at month 240 than from month 40", () => {
  const from10 = run(monthlySip(10), 240).equity[0];
  const from40 = run(monthlySip(40), 240).equity[0];
  const row = (label, h) => ({
    label, contributed: h.contributed, value: Math.round(h.value), gain: Math.round(h.value - h.contributed),
  });
  console.log("\nMonthly 5,000 into broad equity, value at month 240");
  console.table([row("From month 10", from10), row("From month 40", from40)]);

  assert.ok(from10.value > from40.value, "worth more at month 240");
  assert.ok(from10.value - from10.contributed > from40.value - from40.contributed, "and the gain beyond what was paid in is larger");
});

test("ENGINE.md: the scripted crash lands in the scripted months", () => {
  // Averaged over 200 seeds, the worst 10 month stretch of broad equity in months 1 to 60 is months 31 to 40
  const mean = [];
  for (let month = 1; month <= 60; month++) {
    let total = 0;
    for (let seed = 1; seed <= SEEDS; seed++) total += monthlyReturn(seed, "equity", month);
    mean[month] = total / SEEDS;
  }
  let worstStart = null;
  let worst = Infinity;
  for (let start = 1; start <= 51; start++) {
    let growth = 1;
    for (let m = start; m < start + 10; m++) growth *= 1 + mean[m];
    if (growth < worst) {
      worst = growth;
      worstStart = start;
    }
  }
  console.log(`\nWorst average 10 month stretch: months ${worstStart} to ${worstStart + 9}, ${((worst - 1) * 100).toFixed(1)}%`);
  assert.equal(worstStart, 31);

  // And a player holding equity through it sees the fall
  const s = funded(createState(1));
  s.equity.push(holding("E", 100000));
  const history = run(s, 40).equity[0].history;
  const at = (m) => history.find((h) => h.month === m).value;
  console.log(`Seed 1 equity holding: month 30 ${Math.round(at(30))}, month 40 ${Math.round(at(40))}`);
  assert.ok(at(40) < at(30));
});

test("every lesson window keeps its direction in the engine's own market, 200 seeds", () => {
  const results = [];
  for (const w of MARKET_SCRIPT.lesson_windows) {
    let failures = 0;
    let low = Infinity;
    let high = -Infinity;
    for (let seed = 1; seed <= SEEDS; seed++) {
      let growth = 1;
      for (let m = w.months[0]; m <= w.months[1]; m++) growth *= 1 + monthlyReturn(seed, w.instrument, m);
      const net = growth - 1;
      low = Math.min(low, net);
      high = Math.max(high, net);
      if ((w.direction === "down") !== (net < 0)) failures += 1;
    }
    results.push({ window: w.name, net: `${(low * 100).toFixed(1)}% to ${(high * 100).toFixed(1)}%`, failures });
    assert.equal(failures, 0, `${w.name} flipped on ${failures} seeds`);
  }
  console.table(results);
});

test("the noise has mean 0 and variance 1, is bounded, and is deterministic", () => {
  let sum = 0;
  let squares = 0;
  let max = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const x = gaussian(3, "equity", i + 1);
    sum += x;
    squares += x * x;
    max = Math.max(max, Math.abs(x));
  }
  const mean = sum / n;
  const variance = squares / n - mean * mean;
  console.log(`\nNoise over ${n} draws: mean ${mean.toFixed(4)}, variance ${variance.toFixed(4)}, largest ${max.toFixed(2)}`);
  assert.ok(Math.abs(mean) < 0.03);
  assert.ok(Math.abs(variance - 1) < 0.05);
  assert.ok(max <= 6);
  assert.equal(gaussian(3, "equity", 5), gaussian(3, "equity", 5));
  assert.throws(() => gaussian(1.5, "equity", 5), /integer/);
});

test("returns follow section 7: drift, damping inside a lesson window, gold and liquid fund rates", () => {
  const crash = explainMonthlyReturn(1, "equity", 35);
  assert.equal(crash.drift, -0.032);
  assert.equal(crash.damping, CONSTANTS.NOISE_DAMPING, "month 35 is inside CRASH_31_40");
  assert.equal(explainMonthlyReturn(1, "equity", 45).damping, 1);
  assert.equal(explainMonthlyReturn(1, "gold", 5).drift, CONSTANTS.GOLD_ANNUAL_RATE / 12);
  assert.equal(explainMonthlyReturn(1, "liquid", 5).drift, CONSTANTS.LIQUID_FUND_ANNUAL_RATE / 12);
});

test("small caps refuse months their script does not cover", () => {
  assert.throws(() => monthlyReturn(1, "small_cap", 41), /authored through month 40/);
  const s = funded(createState(1));
  s.small_cap.push(holding("S", 10000));
  assert.doesNotThrow(() => run(s, 40));
  assert.throws(() => run(s, 41), /authored through month 40/);
});

test("section 8: a personal loan clears exactly on its last payment", () => {
  const rate = monthlyRate("personal_loan");
  const payment = scheduledPayment(100000, rate, 12);
  let state = createState(1);
  state.debts.push({ type: "personal_loan", opened_by: "test", principal: 100000, months_remaining: 12, payment });
  const paid = [];
  for (let i = 0; i < 12; i++) {
    const result = advanceMonth(state);
    state = result.state;
    paid.push(result.events.find((e) => e.type === "debt_paid"));
  }
  console.log(`\nPersonal loan 1,00,000 over 12 months at ${rate * 100}% a month: payment ${payment.toFixed(2)}, last ${paid[11].payment.toFixed(2)}`);
  assert.deepEqual(state.debts, [], "cleared after 12 payments");
  assert.equal(paid[11].principal, 0);
  assert.ok(Math.abs(paid[11].payment - payment) < 0.01, "the last payment is the scheduled one, less rounding");
  const interestTotal = paid.reduce((t, p) => t + p.interest, 0);
  assert.ok(Math.abs(paid.reduce((t, p) => t + p.payment, 0) - (100000 + interestTotal)) < 1e-6);
});

test("section 8: a card on minimum payments barely moves", () => {
  let state = createState(1);
  state.debts.push({ type: "card", opened_by: "test", principal: 40000, months_remaining: 0, payment: 0 });
  state = run(state, 6);
  let expected = 40000;
  for (let i = 0; i < 6; i++) expected = expected + expected * CONSTANTS.CARD_MONTHLY_RATE - expected * CONSTANTS.CARD_MIN_PAYMENT_PCT;
  console.log(`\nCard 40,000 after six minimum payments: ${state.debts[0].principal.toFixed(2)}`);
  assert.equal(state.debts[0].principal, expected);
});

test("CARD_MINIMUM_FLOOR: a card on minimum payments clears once its balance drops below the floor", () => {
  let state = funded(createState(1));
  state.debts.push({ type: "card", opened_by: "test", principal: 40000, months_remaining: 0, payment: 0 });
  let months = 0;
  let lastPayment = null;
  while (state.debts.length > 0 && months < 600) {
    const result = advanceMonth(state);
    state = result.state;
    months += 1;
    lastPayment = result.events.find((e) => e.type === "debt_paid") || lastPayment;
  }
  console.log(`\nCard 40,000 on minimum payments cleared after ${months} months. Final payment ${lastPayment.payment.toFixed(2)}`);
  assert.deepEqual(state.debts, [], "the card clears");
  const opening = lastPayment.payment / (1 + CONSTANTS.CARD_MONTHLY_RATE);
  assert.ok(opening < CONSTANTS.CARD_MINIMUM_FLOOR, "the final payment cleared a balance below the floor");
  assert.equal(lastPayment.principal, 0);
});

test("GOLD_EQUITY_CORRELATION: gold's noise moves with equity's at about 0.2", () => {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  let count = 0;
  for (let seed = 1; seed <= 100; seed++) {
    for (let month = 1; month <= 240; month++) {
      const x = explainMonthlyReturn(seed, "equity", month).noise;
      const y = explainMonthlyReturn(seed, "gold", month).noise;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; count += 1;
    }
  }
  const cov = sxy / count - (sx / count) * (sy / count);
  const r = cov / Math.sqrt((sxx / count - (sx / count) ** 2) * (syy / count - (sy / count) ** 2));
  const goldVariance = syy / count - (sy / count) ** 2;
  console.log(`\nGold against equity noise over ${count} months: correlation ${r.toFixed(3)}, gold variance ${goldVariance.toFixed(3)}`);
  assert.ok(Math.abs(r - CONSTANTS.GOLD_EQUITY_CORRELATION) < 0.03);
  assert.ok(Math.abs(goldVariance - 1) < 0.05);
});
