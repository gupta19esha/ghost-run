// ENGINE.md step 5: shocks, the month 22 layoff and the five-step payment cascade.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import DECISIONS from "../decisions.js";
import { createState, advanceMonth, applyDecision, getBars, getHistory, decisionsForMonth } from "../index.js";
import { runCascade } from "../shocks.js";

const LAYOFF_MONTH = Object.values(DECISIONS).find((d) => d.shock === "layoff").month;

function holding(opened_by, month_opened, value) {
  return { opened_by, month_opened, value, contributed: value, history: [] };
}

// A player just before the layoff: shared flat rent, and whatever cash and card they have
function atMonth(month) {
  const state = createState(1);
  state.month = month;
  // Costs inflated to this month, as a player who lived months 1 onward would have them
  for (let m = 1; m < month; m++) state.costs.inflation_index *= 1 + CONSTANTS.INFLATION_MONTHLY_RATE;
  return state;
}

function playerBeforeLayoff({ cash, hasCard }) {
  const state = atMonth(LAYOFF_MONTH);
  state.cash = cash;
  state.has_card = hasCard;
  state.commitments.push({
    amount: -9000, months_remaining: 0, destination: "spent", opened_by: "D02-B", holding_opened_by: "D02-B",
    kind: "cost", opened_month: 1, starts_month: 1, term_months: null, paused_months: 0, salary_change: false,
  });
  return state;
}

// Live months 22 to 27, taking D29-A (the 5.8 LPA offer) at month 23
function liveThroughLayoff(state) {
  const rows = [];
  while (state.month <= LAYOFF_MONTH + 5) {
    if (state.month === DECISIONS.D29.month) state = applyDecision(state, "D29", "D29-A").state;
    const month = state.month;
    const result = advanceMonth(state);
    state = result.state;
    const cascade = result.events.find((e) => e.type === "cascade");
    const card = state.debts.find((d) => d.type === "card");
    const bars = getBars(state);
    rows.push({
      month,
      employed: state.employment.employed,
      cash: Math.round(state.cash),
      deepest_step: cascade ? cascade.deepest_step : 0,
      card_debt: Math.round(card ? card.principal : 0),
      net_worth: Math.round(bars.netWorth),
      safety: Math.round(bars.safety),
      freedom: Math.round(bars.freedom),
    });
  }
  return { state, rows };
}

test("ENGINE.md: the month 22 layoff, a prepared player against an unprepared one", () => {
  const prepared = liveThroughLayoff(playerBeforeLayoff({ cash: 300000, hasCard: true }));
  const unprepared = liveThroughLayoff(playerBeforeLayoff({ cash: 5000, hasCard: true }));
  console.log("\nPrepared: 3,00,000 in cash");
  console.table(prepared.rows);
  console.log("Unprepared: 5,000 in cash, a card");
  console.table(unprepared.rows);

  const deepest = (run) => Math.max(...run.rows.map((r) => r.deepest_step));
  assert.ok(deepest(prepared) <= 1, "a prepared player stops at step 1");
  assert.deepEqual(prepared.state.debts, [], "and carries no debt");

  assert.equal(deepest(unprepared), 4, "an unprepared player reaches step 4");
  const card = unprepared.state.debts.find((d) => d.type === "card");
  assert.ok(card && card.principal > 0, "and carries card debt out the other side");
  assert.equal(unprepared.state.employment.employed, true, "even after salary has restarted");

  // D29-A is survivable: once salary restarts, no more borrowing, and the card shrinks
  const afterRestart = unprepared.rows.filter((r) => r.employed);
  assert.ok(afterRestart.every((r) => r.deepest_step === 0), "no cascade once D29-A's salary restarts");
  assert.ok(afterRestart.at(-1).card_debt < afterRestart[0].card_debt, "the card balance falls");
});

test("the layoff: salary stops, raises fold in, severance is paid, and D29-A restarts it lower", () => {
  let state = playerBeforeLayoff({ cash: 300000, hasCard: false });
  state.commitments.push({
    amount: 18000, months_remaining: 0, destination: "cash", opened_by: "D26-A", holding_opened_by: "D26-A",
    kind: "income", opened_month: 20, starts_month: 21, term_months: null, paused_months: 0, salary_change: true,
  });

  const layoff = advanceMonth(state);
  state = layoff.state;
  const event = layoff.events.find((e) => e.type === "layoff");
  assert.equal(event.salary_lost, CONSTANTS.SALARY_NET_START + 18000, "the D26-A raise is part of the salary lost");
  assert.equal(event.severance, (CONSTANTS.SALARY_NET_START + 18000) * CONSTANTS.LAYOFF_SEVERANCE_MONTHS);
  assert.equal(state.income.salary_net, 0);
  assert.ok(!state.commitments.some((c) => c.opened_by === "D26-A"), "the raise stops with the job");

  state = applyDecision(state, "D29", "D29-A").state;
  assert.equal(state.employment.restart_month, 24);
  const month23 = advanceMonth(state);
  state = month23.state;
  assert.equal(month23.events.find((e) => e.type === "salary_in").amount, 0, "month 23: no income");
  const month24 = advanceMonth(state);
  state = month24.state;
  assert.ok(month24.events.some((e) => e.type === "salary_restarted"));
  assert.equal(state.income.salary_net, CONSTANTS.SALARY_NET_START + 18000);
  assert.equal(getBars(state).freedom > 0, true);
  const offer = state.commitments.find((c) => c.opened_by === "D29-A");
  assert.equal(offer.amount, DECISIONS.D29.options["D29-A"].money_monthly, "the offer is below what you made");
  assert.ok(offer.amount < 0);
});

test("the cascade climbs the ladder in order, stopping only when the shortfall is covered", () => {
  const state = createState(1);
  state.month = 30;
  state.cash = -1000000;
  state.cash_at_home = 10000;
  state.liquid_fund = 20000;
  state.fds.push({ opened_by: "D07-B", month_opened: 4, value: 50000, maturity_month: null });
  state.gold.push(holding("GOLD-NEW", 20, 30000), holding("GOLD-OLD", 9, 30000));
  state.equity.push(holding("D16-A", 10, 100000));
  state.small_cap.push(holding("D20-B", 14, 40000));
  state.has_card = true;
  const events = [];
  runCascade(state, CONSTANTS, events);
  const cascade = events[0];
  console.log("\nCascade for a 10,00,000 shortfall");
  console.table(cascade.steps.map((s) => ({ step: s.step, source: s.source, amount: Math.round(s.amount), penalty: s.penalty })));

  assert.deepEqual(cascade.steps.map((s) => s.source), [
    "cash_at_home", "liquid_fund", "fd:D07-B", "gold:GOLD-OLD", "gold:GOLD-NEW", "equity:D16-A", "small_cap:D20-B", "card", "family",
  ], "gold before equity before small caps, oldest holding first");
  assert.equal(cascade.steps[2].amount, 50000 * (1 - CONSTANTS.FD_BREAK_PENALTY), "the FD breaks whole, less the penalty");
  assert.equal(cascade.steps[7].amount, CONSTANTS.CARD_LIMIT, "the card only up to its limit");
  assert.equal(cascade.deepest_step, 5);
  assert.equal(state.cash, 0, "exactly covered");

  const family = state.debts.find((d) => d.opened_by === "family-30");
  const bailout = cascade.steps[8].amount;
  assert.equal(family.principal, bailout, "family money is a debt");
  assert.equal(family.monthly_rate, 0, "at 0% interest");
  assert.equal(family.payment, bailout / CONSTANTS.FAMILY_REPAYMENT_MONTHS);
  assert.equal(family.months_remaining, CONSTANTS.FAMILY_REPAYMENT_MONTHS);
  assert.equal(family.starts_month, 31);
  assert.equal(state.flows.life_effects, -CONSTANTS.FAMILY_LIFE_PENALTY);
  assert.deepEqual([state.gold, state.equity, state.small_cap, state.fds], [[], [], [], []]);
});

test("a partial sale keeps the rest of the holding, with its contribution scaled down", () => {
  const state = createState(1);
  state.month = 30;
  state.cash = -25000;
  state.equity.push(holding("D16-A", 10, 100000));
  runCascade(state, CONSTANTS, []);
  assert.equal(state.equity[0].value, 75000);
  assert.equal(state.equity[0].contributed, 75000);
  assert.equal(state.cash, 0);
});

test("without a card, an unprepared player goes to family at the layoff", () => {
  const run = liveThroughLayoff(playerBeforeLayoff({ cash: 5000, hasCard: false }));
  console.log("\nUnprepared, no card");
  console.table(run.rows);
  assert.equal(Math.max(...run.rows.map((r) => r.deepest_step)), 5);
  assert.ok(run.state.debts.some((d) => d.type === "family"), "a family repayment is running, as a debt");
});

test("family money counts against Net Worth the same as a card", () => {
  const withCard = atMonth(30);
  withCard.cash = -50000;
  withCard.has_card = true;
  const withFamily = atMonth(30);
  withFamily.cash = -50000;
  runCascade(withCard, CONSTANTS, []);
  runCascade(withFamily, CONSTANTS, []);
  assert.equal(getBars(withFamily).netWorth, getBars(withCard).netWorth);
  assert.ok(getBars(withFamily).netWorth < 0);
});

test("the family Life penalty lands once per episode of consecutive months at step 5", () => {
  const state = atMonth(30);
  const penalties = [];
  for (const month of [30, 31, 32, 34, 35]) {
    state.month = month;
    state.cash = -10000;
    const events = [];
    runCascade(state, CONSTANTS, events);
    penalties.push(events[0].steps.find((s) => s.source === "family").life_penalty);
  }
  const P = CONSTANTS.FAMILY_LIFE_PENALTY;
  assert.deepEqual(penalties, [P, 0, 0, P, 0], "months 30 to 32 are one episode, 34 and 35 another");
});

test("D17-C: an 18,000 card balance at month 11 has barely moved by the month 17 callback", () => {
  let state = atMonth(DECISIONS.D17.month);
  state.cash = 1e9;
  state = applyDecision(state, "D17", "D17-C").state;
  const card = () => state.debts.find((d) => d.type === "card");
  assert.equal(card().principal, DECISIONS.D17.options["D17-C"].card_balance);
  const callback = state.pending_callbacks.find((c) => c.opened_by === "D17-C");
  assert.equal(callback.def_money_once, 0, "no deferred cash, the card carries it");
  assert.equal(callback.def_money_monthly, 0);
  while (state.month <= callback.month) state = advanceMonth(state).state;
  let expected = DECISIONS.D17.options["D17-C"].card_balance;
  for (let m = 0; m < callback.month - DECISIONS.D17.month; m++) {
    expected = expected * (1 + CONSTANTS.CARD_MONTHLY_RATE) - expected * CONSTANTS.CARD_MIN_PAYMENT_PCT;
  }
  console.log(`
D17-C card at month ${callback.month}: ${Math.round(card().principal)}`);
  assert.ok(Math.abs(card().principal - expected) < 1e-6);
});

test("D28-C: while unemployed each month's gap goes on the card, and savings are left alone", () => {
  let state = playerBeforeLayoff({ cash: 300000, hasCard: false });
  state = applyDecision(state, "D28", "D28-C").state;
  assert.equal(state.has_card, true, "D28-C gives a card, even to a player who refused D17's");
  const rows = [];
  while (state.month <= LAYOFF_MONTH + 6) {
    if (state.month === DECISIONS.D29.month) state = applyDecision(state, "D29", "D29-B").state;
    const month = state.month;
    const result = advanceMonth(state);
    state = result.state;
    const gap = result.events.find((e) => e.type === "gap_on_card");
    const card = state.debts.find((d) => d.type === "card");
    rows.push({ month, employed: state.employment.employed, gap_on_card: Math.round(gap ? gap.amount : 0), card: Math.round(card ? card.principal : 0), cash: Math.round(state.cash) });
  }
  console.log("\nD28-C with 3,00,000 saved, then D29-B");
  console.table(rows);
  const unemployed = rows.filter((r) => !r.employed);
  assert.ok(unemployed.slice(1).every((r) => r.gap_on_card > 0), "every month without salary goes on the card");
  assert.ok(rows.filter((r) => r.employed).every((r) => r.gap_on_card === 0), "and stops once salary restarts");
  assert.ok(rows.at(-1).cash >= 300000, "the savings were never touched");
});

test("grants_card: D17-A and D17-C give a card, D17-B and D17-D do not", () => {
  const card = (optionId) => {
    const state = createState(1);
    state.month = DECISIONS.D17.month;
    return applyDecision(state, "D17", optionId).state.has_card;
  };
  assert.deepEqual(["D17-A", "D17-B", "D17-C", "D17-D"].map(card), [true, false, true, false]);
  const d28 = createState(1);
  d28.month = DECISIONS.D28.month;
  assert.equal(applyDecision(d28, "D28", "D28-C").state.has_card, true);
});

test("the cascade also covers an ordinary month that ends negative, not only a shock", () => {
  const state = createState(1);
  state.month = 5;
  state.cash = -1000;
  state.cash_at_home = 5000;
  const events = [];
  runCascade(state, CONSTANTS, events);
  assert.equal(events[0].deepest_step, 1);
  assert.equal(state.cash_at_home, 4000);
  assert.equal(state.cash, 0);
});

test("within Chapter 1, no housing and layoff path reaches the card limit", () => {
  // Every combination of the choices that set housing, the card, the layoff and the next job.
  // Every other decision takes the option that moves the least money, so the test isolates
  // these paths. A heavy spender elsewhere can still reach the limit (section 14).
  const PATH = ["D02", "D17", "D24", "D27", "D28", "D29"];
  const CHAPTER_END = 24;
  const moves = (o) => Math.abs((o.money_once || 0) + (o.money_once_2 || 0)) +
    CHAPTER_END * Math.abs((o.money_monthly || 0) + (o.money_monthly_2 || 0)) + (o.card_balance || 0);
  // Among the options the state offers (rule 29)
  const quiet = (d) => Object.values(d.options).sort((a, b) => moves(a) - moves(b))[0].option_id;

  let paths = 0;
  let impossible = 0;
  let highest = { card: 0 };
  const walk = (i, choice) => {
    if (i < PATH.length) {
      for (const optionId of Object.keys(DECISIONS[PATH[i]].options)) walk(i + 1, { ...choice, [PATH[i]]: optionId });
      return;
    }
    // A combination whose chosen option is not offered on its own path cannot happen: D28-B
    // stops a monthly investment, and on this path only D27-B or D27-C starts one
    let state = createState(1);
    const offeredAll = () => {
      for (;;) {
        for (const d of decisionsForMonth(state)) {
          const chosen = choice[d.decision_id];
          if (chosen && !d.options[chosen]) return false;
          state = applyDecision(state, d.decision_id, chosen || quiet(d)).state;
        }
        return true;
      }
    };
    const months = [];
    while (state.month <= CHAPTER_END) {
      if (!offeredAll()) {
        impossible += 1;
        return;
      }
      months.push(state.month);
      state = advanceMonth(state).state;
      if (state.month - 1 === CHAPTER_END) paths += 1;
      const card = state.debts.find((d) => d.type === "card");
      const principal = card ? card.principal : 0;
      assert.ok(principal < CONSTANTS.CARD_LIMIT, `${Object.values(choice).join(" ")} reached the card limit at month ${state.month - 1}`);
      if (principal > highest.card) highest = { card: principal, month: state.month - 1, path: Object.values(choice).join(" ") };
    }
  };
  walk(0, {});
  console.log(`\n${paths} housing and layoff paths to month ${CHAPTER_END}, and ${impossible} combinations that cannot happen (rule 29). Highest card balance ${Math.round(highest.card)} at month ${highest.month}: ${highest.path}`);
  assert.equal(paths + impossible, PATH.reduce((n, id) => n * Object.keys(DECISIONS[id].options).length, 1));
  assert.ok(paths > 0);
});
