// ENGINE.md step 2: the four bars. Hand-built states, asserted, with the workings printed.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import { createState, advanceMonth, getBars, explainBars, getHistory, compareBars, safetyInDanger, barMarks } from "../index.js";
import { explainDiscretionary, savingThisMonth } from "../bars.js";

const CLOSE = 1e-9;

function show(title, workings) {
  const round = (_, v) => (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
  console.log(`\n${title}\n${JSON.stringify(workings, round, 2)}`);
}

function holding(opened_by, value) {
  return { opened_by, month_opened: 1, value, contributed: value, history: [] };
}

// A player with six months of runway and health cover
function preparedPlayer() {
  const s = createState(1);
  s.commitments.push({ amount: -9000, months_remaining: 0, destination: "spent", opened_by: "D02-B", kind: "cost" });
  const burn = s.costs.minimum_living + 9000;
  s.cash = CONSTANTS.SAFETY_TARGET_MONTHS * burn;
  s.cover.health_cover = 300000;
  return s;
}

// A player with 70% of in-hand income committed
function committedPlayer() {
  const s = createState(1);
  s.commitments.push(
    { amount: -18000, months_remaining: 0, destination: "spent", opened_by: "D02-A", kind: "cost" },
    { amount: -6600, months_remaining: 12, destination: "spent", opened_by: "D11-C", kind: "cost" },
    { amount: -4310, months_remaining: 24, destination: "locked_short", opened_by: "D16-B", kind: "saving" },
    // A saving into equity can stop any month, so it must not count as committed
    { amount: -5000, months_remaining: 0, destination: "equity", opened_by: "D27-B", kind: "saving" },
  );
  return s;
}

// Laid off, with debt, savings spread across every bucket, and a dependent with no term cover
function laidOffPlayer() {
  const s = createState(1);
  s.income.salary_net = 0;
  s.cash = 30000;
  s.fds.push({ opened_by: "D07-B", month_opened: 1, value: 20000, maturity_month: null });
  s.equity.push(holding("D16-A", 50000));
  s.small_cap.push(holding("D20-B", 20000));
  s.gold.push(holding("D15-A", 10000));
  s.debts.push({ type: "card", principal: 40000, monthly_rate: CONSTANTS.CARD_MONTHLY_RATE, months_remaining: 0, payment: 0 });
  s.commitments.push({ amount: -9000, months_remaining: 0, destination: "spent", opened_by: "D02-B", kind: "cost" });
  s.cover.dependents = 1;
  s.cover.health_cover = 0; // company cover ends with the job, D09-C
  return s;
}

test("living cost tiers: minimum below normal below actual", () => {
  assert.ok(CONSTANTS.MINIMUM_LIVING_START < CONSTANTS.NORMAL_LIVING_START);
  assert.ok(CONSTANTS.NORMAL_LIVING_START < CONSTANTS.LIVING_COSTS_START);
});

test("a new player starts with the company health cover D09 states", () => {
  assert.equal(createState(1).cover.health_cover, CONSTANTS.HEALTH_COVER_START);
});

test("the leak is not a life lived, but saving is money not lived on: D02-B reference path, month 1", () => {
  // Step 7 ruling: LEAK_DISCRETIONARY_SHARE is 0. Until then 40% of the leak counted, which
  // gave a maximum-saving player a higher baseline than a random player (section 14).
  // Ruled 27 September 2026: deliberate saving shrinks spending above normal (section 6).
  const rent = 9000;
  const rows = [["no saving", 0], ["D04-A saves 6,000", 6000], ["D04-B saves 12,000", 12000]].map(([name, saving]) => {
    const s = createState(1);
    const unallocated = Math.max(0, CONSTANTS.SALARY_NET_START - rent - saving - CONSTANTS.LIVING_COSTS_START);
    const leak = unallocated * CONSTANTS.CASH_LEAK_RATE;
    s.flows.saving_paid = saving;
    const d = explainDiscretionary(s, leak);
    s.flows.discretionary_this_month = d.discretionary_this_month;
    return { name, leak, saved_share: d.saved_share, ...explainBars(s).life.baseline };
  });
  show("Life baseline by allocation, D02-B reference path, month 1", rows);
  assert.equal(CONSTANTS.LEAK_DISCRETIONARY_SHARE, 0);
  assert.ok(rows[0].leak > rows[2].leak, "the leak differs");
  assert.ok(rows[0].baseline > rows[1].baseline && rows[1].baseline > rows[2].baseline, "and saving more lowers the baseline");
  assert.ok(rows[0].baseline < CONSTANTS.LIFE_BASELINE_FLOOR + CONSTANTS.LIFE_DISCRETIONARY_WEIGHT, "not at the ceiling");
  const expected = 6000 / (CONSTANTS.SAVING_FULL_SHARE * CONSTANTS.SALARY_NET_START);
  assert.ok(Math.abs(rows[1].saved_share - expected) < CLOSE, "the share saved is against the yardstick");
});

test("saving SAVING_FULL_SHARE of the yardstick puts the Life baseline at the floor", () => {
  const s = createState(1);
  s.flows.saving_paid = CONSTANTS.SAVING_FULL_SHARE * CONSTANTS.SALARY_NET_START;
  s.flows.discretionary_this_month = explainDiscretionary(s, 0).discretionary_this_month;
  assert.equal(s.flows.discretionary_this_month, 0);
  assert.equal(explainBars(s).life.baseline.baseline, CONSTANTS.LIFE_BASELINE_FLOOR);
});

test("a one-off into saving counts spread over SAVING_ONE_OFF_SPREAD_MONTHS", () => {
  const spread = CONSTANTS.SAVING_ONE_OFF_SPREAD_MONTHS;
  const s = createState(1);
  s.one_off_savings.push({ opened_by: "D15-A", amount: 60000, month: 9 });
  const at = (month) => savingThisMonth({ ...s, month });
  assert.equal(at(8), 0, "not before its month");
  assert.equal(at(9), 60000 / spread);
  assert.equal(at(9 + spread - 1), 60000 / spread);
  assert.equal(at(9 + spread), 0, "and not after the spread");
});

test("choosing D04-A records recurring saving that lowers the month's baseline", async () => {
  const { applyDecision } = await import("../index.js");
  const DECISIONS = (await import("../decisions.js")).default;
  const play = (optionD04) => {
    let state = createState(1);
    state = applyDecision(state, "D01", "D01-B", DECISIONS).state;
    state = applyDecision(state, "D02", "D02-B", DECISIONS).state;
    state = advanceMonth(state).state;
    state = applyDecision(state, "D04", optionD04, DECISIONS).state;
    // The transfer starts the month after the decision
    return advanceMonth(advanceMonth(state).state).state;
  };
  const saver = play("D04-A");
  const leftover = play("D04-C");
  assert.equal(saver.flows.saving_this_month, 6000);
  assert.equal(leftover.flows.saving_this_month, 0);
  assert.ok(saver.flows.life_baseline < leftover.flows.life_baseline);
});

test("Safety weights sum to 100", () => {
  assert.equal(CONSTANTS.SAFETY_RUNWAY_WEIGHT + CONSTANTS.SAFETY_HEALTH_WEIGHT + CONSTANTS.SAFETY_TERM_WEIGHT, 100);
});

test("six months of runway and health cover scores high on Safety", () => {
  const s = preparedPlayer();
  const w = explainBars(s).safety;
  show("Prepared player: Safety workings", w);

  assert.ok(Math.abs(w.runway_months - CONSTANTS.SAFETY_TARGET_MONTHS) < CLOSE);
  assert.equal(w.runway_component, CONSTANTS.SAFETY_RUNWAY_WEIGHT);
  assert.equal(w.health_component, CONSTANTS.SAFETY_HEALTH_WEIGHT);
  assert.equal(w.term_component, CONSTANTS.SAFETY_TERM_WEIGHT, "no dependents scores full term points");
  assert.equal(getBars(s).safety, 100);
});

test("70% of income committed scores zero on Freedom", () => {
  const s = committedPlayer();
  const w = explainBars(s).freedom;
  show("Committed player: Freedom workings", w);

  assert.equal(w.cost_commitments, 18000 + 6600);
  assert.equal(w.locked_savings, 4310, "the equity saving is not committed");
  assert.equal(w.committed_ratio, CONSTANTS.FREEDOM_CEILING_RATIO);
  assert.equal(getBars(s).freedom, 0);

  // Half the ceiling committed scores half the bar
  const half = createState(1);
  half.commitments.push({ amount: -41300 * CONSTANTS.FREEDOM_CEILING_RATIO / 2, months_remaining: 0, destination: "spent", opened_by: "test", kind: "cost" });
  assert.ok(Math.abs(getBars(half).freedom - 50) < CLOSE);
});

test("a laid-off player: every Net Worth part, the haircuts, and no Freedom", () => {
  const s = laidOffPlayer();
  const w = explainBars(s);
  show("Laid-off player: all workings", w);

  assert.equal(w.net_worth.net_worth, 30000 + 20000 + 50000 + 20000 + 10000 - 40000);

  const burn = CONSTANTS.MINIMUM_LIVING_START + 9000 + 40000 * CONSTANTS.CARD_MIN_PAYMENT_PCT;
  const reachable =
    30000 +
    20000 * (1 - CONSTANTS.FD_BREAK_PENALTY) +
    50000 * CONSTANTS.EQUITY_CRISIS_HAIRCUT +
    20000 * CONSTANTS.SMALL_CAP_CRISIS_HAIRCUT +
    10000 * CONSTANTS.GOLD_CRISIS_HAIRCUT;
  assert.ok(Math.abs(w.safety.essential_burn - burn) < CLOSE);
  // Card debt is netted against reachable money (ruled 30 September 2026): 40,000 is owed
  assert.ok(Math.abs(w.safety.reachable_gross - reachable) < CLOSE);
  assert.equal(w.safety.card_debt, 40000);
  assert.ok(Math.abs(w.safety.reachable - (reachable - 40000)) < CLOSE, "money owed on the card is not runway");
  assert.equal(w.safety.annual_income, 12 * CONSTANTS.SALARY_NET_START, "annual income comes from the last job");
  assert.equal(w.safety.health_component, 0);
  assert.equal(w.safety.term_component, 0, "a dependent with no term cover scores nothing");
  const expected = ((reachable - 40000) / burn / CONSTANTS.SAFETY_TARGET_MONTHS) * CONSTANTS.SAFETY_RUNWAY_WEIGHT;
  assert.ok(Math.abs(w.safety.safety - expected) < CLOSE);

  // Ruled 27 September 2026: with no salary, the committed ratio is against the last salary
  const committed = 9000 + 40000 * CONSTANTS.CARD_MIN_PAYMENT_PCT;
  assert.equal(w.freedom.against_last_salary, true);
  assert.equal(w.freedom.income_for_ratio, CONSTANTS.SALARY_NET_START);
  const ratio = committed / CONSTANTS.SALARY_NET_START;
  assert.ok(Math.abs(w.freedom.freedom - ((CONSTANTS.FREEDOM_CEILING_RATIO - ratio) / CONSTANTS.FREEDOM_CEILING_RATIO) * 100) < CLOSE,
    "Freedom against the last salary, not 0");
});

test("Life drifts toward its baseline, one month at a time", () => {
  const { state, events } = advanceMonth(createState(1));
  const w = explainBars(state).life;
  show("Month 1, no decisions: Life workings", w);

  const expected =
    CONSTANTS.LIFE_SCORE_START +
    CONSTANTS.LIFE_DRIFT * (w.baseline.baseline - CONSTANTS.LIFE_SCORE_START);
  assert.ok(Math.abs(state.life_score - expected) < CLOSE);
  assert.deepEqual(events.find((e) => e.type === "bars").life, state.life_score);

  // Discretionary spending at half the target gives half the discretionary points
  const s = createState(1);
  s.flows.discretionary_this_month = CONSTANTS.SALARY_NET_START * CONSTANTS.DISCRETIONARY_TARGET / 2;
  assert.ok(Math.abs(explainBars(s).life.baseline.baseline - (CONSTANTS.LIFE_BASELINE_FLOOR + CONSTANTS.LIFE_DISCRETIONARY_WEIGHT / 2)) < CLOSE);

  // No income: the baseline sits at the floor
  const laidOff = laidOffPlayer();
  laidOff.flows.discretionary_this_month = 10000;
  assert.equal(explainBars(laidOff).life.baseline.baseline, CONSTANTS.LIFE_BASELINE_FLOOR);

  // No salary but a tiny income, such as D30-B's 300 a month: still the floor, not the ceiling
  const payout = laidOffPlayer();
  payout.commitments.push({ amount: 300, months_remaining: 0, destination: "cash", opened_by: "D30-B", kind: "income" });
  payout.flows.discretionary_this_month = 2684;
  assert.equal(explainBars(payout).life.baseline.baseline, CONSTANTS.LIFE_BASELINE_FLOOR);
});

test("a raise does not lower the Life baseline", () => {
  const before = createState(1);
  before.flows.discretionary_this_month = 2400;
  const raised = createState(1);
  raised.flows.discretionary_this_month = 2400;
  raised.commitments.push({ amount: 18000, months_remaining: 0, destination: "cash", opened_by: "D26-A", kind: "income", salary_change: true });
  const a = explainBars(before).life.baseline;
  const b = explainBars(raised).life.baseline;
  assert.ok(b.income_net > a.income_net);
  assert.equal(b.baseline, a.baseline, "same spending, same baseline, whatever the pay");
});

test("do-nothing player: bars over 24 months", () => {
  let state = createState(1);
  for (let i = 0; i < 24; i++) state = advanceMonth(state).state;
  const history = getHistory(state);
  console.log("\nDo-nothing player: bars by month");
  console.log("Month  Net worth  Safety  Freedom   Life  Life baseline");
  for (const h of history.filter((h) => h.month === 1 || h.month % 6 === 0)) {
    console.log(
      [h.month, Math.round(h.net_worth), h.safety.toFixed(1), h.freedom.toFixed(1), h.life.toFixed(2), h.life_baseline.toFixed(1)]
        .map((v, j) => String(v).padStart([5, 9, 6, 7, 6, 13][j])).join("  "),
    );
  }
  show("Do-nothing player, month 24: workings", explainBars(state));

  const last = history.at(-1);
  const ceiling = CONSTANTS.LIFE_BASELINE_FLOOR + CONSTANTS.LIFE_DISCRETIONARY_WEIGHT;
  for (const h of history) {
    assert.ok(h.life_baseline < ceiling, `month ${h.month}: a do-nothing player must not sit at the Life ceiling`);
  }
  assert.deepEqual(
    { netWorth: last.net_worth, safety: last.safety, freedom: last.freedom, life: last.life },
    getBars(state),
    "history and getBars agree",
  );
});

test("compareBars: each bar at the start and end of a month, and the change", () => {
  const start = createState(1);
  const before = getBars(start);
  const after = getBars(advanceMonth(start).state);
  const compared = compareBars(before, after);
  for (const key of ["netWorth", "safety", "freedom", "life"]) {
    assert.equal(compared[key].before, before[key]);
    assert.equal(compared[key].after, after[key]);
    assert.equal(compared[key].change, after[key] - before[key]);
  }
  assert.ok(compared.netWorth.change > 0, "month 1 ends with more than it started");
});

test("safetyInDanger: runway below SAFETY_DANGER_MONTHS, whatever the bar did", () => {
  // A player with no reachable money at all is in danger
  const broke = createState(1);
  broke.cash = 0;
  assert.equal(explainBars(broke).safety.runway_months, 0);
  assert.equal(safetyInDanger(broke), true, "no runway is danger");
  // A new player starts with the sheet README's opening cash, 20,000 since v28, which is their
  // first runway: 20,000 over 11,700 of minimum living is 1.7 months, already out of danger
  const start = createState(1);
  assert.ok(Math.abs(explainBars(start).safety.runway_months - CONSTANTS.NET_WORTH_START / CONSTANTS.MINIMUM_LIVING_START) < CLOSE);
  assert.equal(safetyInDanger(start), CONSTANTS.NET_WORTH_START / CONSTANTS.MINIMUM_LIVING_START < CONSTANTS.SAFETY_DANGER_MONTHS);
  const after = advanceMonth(start).state;
  assert.ok(explainBars(after).safety.runway_months >= CONSTANTS.SAFETY_DANGER_MONTHS);
  assert.equal(safetyInDanger(after), false, "a month's pay banked is out of danger");
  assert.equal(safetyInDanger(after, { ...CONSTANTS, SAFETY_DANGER_MONTHS: 99 }), true, "the threshold is the constant");
});

test("Safety nets card debt: a card balance larger than savings leaves no runway", () => {
  const s = createState(1);
  s.cash = 30000;
  const before = explainBars(s).safety;
  s.debts.push({ type: "card", principal: 50000, monthly_rate: CONSTANTS.CARD_MONTHLY_RATE, months_remaining: 0, payment: 0 });
  const after = explainBars(s).safety;
  assert.ok(before.runway_months > 0);
  assert.equal(after.reachable, 0, "never below zero");
  assert.equal(after.runway_months, 0);
  assert.ok(after.safety < before.safety);
});

test("barMarks: each good mark is where that bar would sit at the good level", () => {
  const marks = barMarks();
  // Safety: a new player holding exactly SAFETY_GOOD_MONTHS of runway, with the company cover
  const s = createState(1);
  s.cash = CONSTANTS.SAFETY_GOOD_MONTHS * explainBars(s).safety.essential_burn;
  assert.ok(Math.abs(explainBars(s).safety.safety - marks.safety) < CLOSE);
  assert.ok(Math.abs(marks.safety - 65) < CLOSE, "the ruled position");
  // Freedom: FREEDOM_GOOD_COMMITTED of pay committed
  assert.ok(Math.abs(marks.freedom - ((0.7 - 0.4) / 0.7) * 100) < CLOSE);
  // Life: the middle of the baseline
  assert.equal(marks.life, CONSTANTS.LIFE_BASELINE_FLOOR + CONSTANTS.LIFE_DISCRETIONARY_WEIGHT / 2);
});
