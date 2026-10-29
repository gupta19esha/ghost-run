// ENGINE.md step 1: run 24 months with no decisions. Salary in, costs out, nothing else.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import DECISIONS from "../decisions.js";
import { createState, advanceMonth, getHistory } from "../index.js";

const MONTHS = 24;
// Section 9: everyone gets the layoff, in the month of the sheet's layoff decision
const LAYOFF_MONTH = Object.values(DECISIONS).find((d) => d.shock === "layoff").month;
const CLOSE = 1e-6;

function run(months, constants = CONSTANTS, seed = 1) {
  let state = createState(seed, constants);
  for (let i = 0; i < months; i++) state = advanceMonth(state, constants).state;
  return state;
}

function printTable(history, title) {
  const cols = ["Month", "Age", "Salary in", "Living costs", "Leak", "Cash interest", "Retirement", "Change", "Net worth"];
  const rows = history.map((h, i) => {
    const previous = i === 0 ? CONSTANTS.NET_WORTH_START : history[i - 1].net_worth;
    return [
      h.month, h.age, h.salary_in, h.living_costs, h.leak, h.cash_interest,
      h.retirement_contribution + h.retirement_credit, h.net_worth - previous, h.net_worth,
    ].map((v, j) => (j < 2 ? String(v) : Math.round(v).toLocaleString("en-IN")));
  });
  const widths = cols.map((c, j) => Math.max(c.length, ...rows.map((r) => r[j].length)));
  const line = (cells) => cells.map((c, j) => c.padStart(widths[j])).join("  ");
  console.log(`\n${title}\n${line(cols)}\n${widths.map((w) => "-".repeat(w)).join("  ")}`);
  rows.forEach((r) => console.log(line(r)));
}

test("opening position", () => {
  const s = createState(1);
  assert.equal(s.month, 1);
  assert.equal(s.age, CONSTANTS.AGE_START);
  assert.equal(s.income.salary_net, CONSTANTS.SALARY_NET_START);
  assert.equal(s.income.salary_gross, CONSTANTS.SALARY_GROSS_START);
  assert.equal(s.cash, CONSTANTS.NET_WORTH_START);
  assert.equal(s.life_score, CONSTANTS.LIFE_SCORE_START);
  for (const list of ["equity", "gold", "small_cap", "assets", "debts", "commitments", "history"]) {
    assert.deepEqual(s[list], [], list);
  }
});

test("advanceMonth does not change the state it is given", () => {
  const before = createState(1);
  const copy = structuredClone(before);
  advanceMonth(before);
  assert.deepEqual(before, copy);
});

test("24 months with no decisions, through the layoff: every month's change is explained exactly", () => {
  const history = getHistory(run(MONTHS));
  printTable(history, "24 months, no decisions");
  assert.equal(history.length, MONTHS);

  let cash = CONSTANTS.NET_WORTH_START;
  let retirement = 0;
  let accrued = 0;
  let index = 1;
  history.forEach((h, i) => {
    const month = i + 1;
    if (month > 1) index *= 1 + CONSTANTS.INFLATION_MONTHLY_RATE;
    const living = CONSTANTS.LIVING_COSTS_START * index;

    // Steps 1, 2 and 4. From the layoff month, salary stops. The layoff month pays
    // LAYOFF_SEVERANCE_MONTHS of salary as severance, and no retirement contribution.
    const employed = month < LAYOFF_MONTH;
    const cashIn = employed ? CONSTANTS.SALARY_NET_START
      : month === LAYOFF_MONTH ? CONSTANTS.SALARY_NET_START * CONSTANTS.LAYOFF_SEVERANCE_MONTHS : 0;
    cash += cashIn - living;
    if (employed) retirement += CONSTANTS.RETIREMENT_CONTRIBUTION_MONTHLY;
    // Step 7
    cash += cash * CONSTANTS.SAVINGS_ANNUAL_RATE / 12;
    accrued += retirement * CONSTANTS.RETIREMENT_ANNUAL_RATE / 12;
    if (month % 12 === 0) {
      retirement += accrued;
      accrued = 0;
    }
    // Step 9
    const leak = Math.max(0, cashIn - living) * CONSTANTS.CASH_LEAK_RATE;
    cash -= leak;

    assert.equal(h.month, month);
    assert.equal(h.age, CONSTANTS.AGE_START + Math.floor((month - 1) / 12));
    assert.equal(h.salary_in, cashIn);
    assert.equal(h.employed, employed);
    assert.equal(h.cascade_deepest_step, 0, "a do-nothing player's savings cover the layoff months");
    assert.equal(h.living_costs, living, `month ${month} living costs, exact`);
    assert.equal(h.normal_living, CONSTANTS.NORMAL_LIVING_START * index, `month ${month} normal living, exact`);
    assert.equal(h.minimum_living, CONSTANTS.MINIMUM_LIVING_START * index, `month ${month} minimum living, exact`);
    assert.ok(Math.abs(h.leak - leak) < CLOSE, `month ${month} leak`);
    assert.ok(Math.abs(h.cash - cash) < CLOSE, `month ${month} cash`);
    assert.ok(Math.abs(h.retirement_fund - retirement) < CLOSE, `month ${month} retirement fund`);
    assert.ok(Math.abs(h.net_worth - (cash + retirement)) < CLOSE, `month ${month} net worth`);
  });
});

test("with inflation, interest and retirement at 0 the line is exactly straight until the layoff", () => {
  const flat = {
    ...CONSTANTS,
    INFLATION_MONTHLY_RATE: 0,
    SAVINGS_ANNUAL_RATE: 0,
    RETIREMENT_CONTRIBUTION_MONTHLY: 0,
    RETIREMENT_ANNUAL_RATE: 0,
  };
  const history = getHistory(run(LAYOFF_MONTH - 1, flat));
  printTable(history, "Months before the layoff, no decisions, inflation, interest and retirement set to 0");
  const perMonth =
    (CONSTANTS.SALARY_NET_START - CONSTANTS.LIVING_COSTS_START) * (1 - CONSTANTS.CASH_LEAK_RATE);
  // The opening cash sits under the line: it is not this month's flow, so it never leaks
  history.forEach((h, i) => {
    assert.ok(Math.abs(h.net_worth - (CONSTANTS.NET_WORTH_START + perMonth * (i + 1))) < CLOSE, `month ${i + 1}`);
  });
});

// Permanent. The do-nothing baseline: month 24 net worth for a player who makes no decisions.
//
// Recorded figures:
//   2,71,262  Engine step 1, before interest and retirement: salary, living costs and the leak.
//   3,84,670  After the step 1 rulings: 2,71,262
//               +     9,241  interest on cash at SAVINGS_ANNUAL_RATE
//               +    96,000  retirement contributions, UNVERIFIED placeholder
//               +     8,166  retirement interest, UNVERIFIED placeholder
//   3,84,080  After the step 2 rulings. Fell 590: inflation compounded monthly at 6% / 12,
//             an effective 6.17% a year, so living costs were slightly higher. The leak-only
//             figure fell from 2,71,262 to 2,70,685.
//   3,84,670  After the leak and inflation rulings. Rose 590, and the rise is understood:
//             INFLATION_MONTHLY_RATE compounds to exactly 6% a year again, as D13 states, so
//             living costs are back to their step 1 path. The leak-only figure is back to
//             2,71,262. LEAK_DISCRETIONARY_SHARE changes Life only, not net worth.
//   3,00,877  After engine step 5. Fell 83,793, and the fall is understood: the month 22
//             layoff reaches the do-nothing player. Salary stops at month 22, one month of
//             severance replaces it that month, and months 23 and 24 have no income.
//             Retirement contributions stop from month 22. The leak-only figure fell from
//             2,71,262 to 1,99,926.
//   3,22,113  27 September 2026, sheet v28. Rose 21,236, and the rise is understood: the
//             player now starts with 20,000 of opening cash (the README's Starting net worth,
//             ruled 27 September 2026), where it was 0. The other 1,236 is savings interest on
//             that 20,000 over 24 months, at SAVINGS_ANNUAL_RATE. The opening cash is not a
//             month's flow, so it never leaks. The leak-only figure rose by exactly 20,000,
//             from 1,99,926 to 2,19,926.
//
// This figure should fall as rent and decisions arrive. A rise is a signal something is
// wrong. Doing nothing already beats the section 13 month 24 median of 2.5L even at
// 2,71,262, which means the cash leak is not yet punishing enough. The 1,04,166 of
// retirement rests on UNVERIFIED placeholders and will move when they are checked.
const DO_NOTHING_MONTH_24 = 322113;
const DO_NOTHING_MONTH_24_LEAK_ONLY = 219926;

function checkBaseline(actual, recorded, label) {
  const rounded = Math.round(actual);
  if (rounded > recorded) {
    assert.fail(`${label} ROSE from ${recorded} to ${rounded}. A rise is a signal something is wrong. Investigate before updating.`);
  }
  if (rounded < recorded) {
    assert.fail(`${label} fell from ${recorded} to ${rounded}. Expected as rent and decisions arrive. If the cause is understood, update the recorded figure.`);
  }
}

test("do-nothing baseline at month 24", () => {
  const month24 = getHistory(run(MONTHS)).at(-1);
  checkBaseline(month24.net_worth, DO_NOTHING_MONTH_24, "Do-nothing month 24 net worth");

  const leakOnly = {
    ...CONSTANTS,
    SAVINGS_ANNUAL_RATE: 0,
    RETIREMENT_CONTRIBUTION_MONTHLY: 0,
    RETIREMENT_ANNUAL_RATE: 0,
  };
  checkBaseline(getHistory(run(MONTHS, leakOnly)).at(-1).net_worth, DO_NOTHING_MONTH_24_LEAK_ONLY,
    "Do-nothing month 24 net worth without interest or retirement");
});

test("retirement constants are still marked UNVERIFIED", () => {
  // Fails if the UNVERIFIED mark is removed from section 12. Change this test only once both
  // figures have been checked against a primary source (section 14).
  for (const name of ["RETIREMENT_CONTRIBUTION_MONTHLY", "RETIREMENT_ANNUAL_RATE"]) {
    assert.ok(CONSTANTS.UNVERIFIED.includes(name), `${name} is no longer marked UNVERIFIED`);
  }
});

test("the same seed produces the same run", () => {
  assert.deepEqual(getHistory(run(MONTHS, CONSTANTS, 42)), getHistory(run(MONTHS, CONSTANTS, 42)));
});
