// The four bars from SIMULATION-MATHS.md sections 3 to 6.
// explainBars returns every intermediate value, so a result can always be traced.
// getBars returns only the four numbers the UI shows.

import CONSTANTS from "./constants.js";

const BAR_MAX = 100; // every bar runs 0 to 100, section 4 to 6
const MONTHS_PER_YEAR = 12;

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

// A commitment paused by rule 17 is not committed while the pause lasts
function active(state) {
  return state.commitments.filter((c) => !(c.paused_months > 0));
}

function commitmentTotal(state, predicate) {
  return active(state).filter(predicate).reduce((total, c) => total - c.amount, 0);
}

// Section 8: card balance × CARD_MIN_PAYMENT_PCT, the scheduled payment for a loan.
export function debtMinimums(state, constants = CONSTANTS) {
  return state.debts.reduce(
    (total, d) => total + (d.type === "card" ? d.principal * constants.CARD_MIN_PAYMENT_PCT : d.payment),
    0,
  );
}

// Section 2 monthly flows
export function incomeNet(state) {
  return state.income.salary_net + sum(active(state).filter((c) => c.kind === "income"), "amount");
}

// Section 3
export function explainNetWorth(state) {
  const parts = {
    cash: state.cash,
    cash_at_home: state.cash_at_home,
    liquid_fund: state.liquid_fund,
    fds: sum(state.fds, "value"),
    equity: sum(state.equity, "value"),
    gold: sum(state.gold, "value"),
    small_cap: sum(state.small_cap, "value"),
    retirement_fund: state.retirement_fund,
    endowment_balance: state.endowment_balance,
    tax_product_balance: state.tax_product_balance,
    assets: sum(state.assets, "current_value"),
    debts: -sum(state.debts, "principal"),
  };
  return { ...parts, net_worth: Object.values(parts).reduce((a, b) => a + b, 0) };
}

// Section 10.1 {total_saved}: cash, the liquid fund, deposits, equity and gold. Not the
// retirement fund, small caps or bought assets.
export function savedTotal(state) {
  return state.cash + state.liquid_fund + sum(state.fds, "value") + sum(state.equity, "value") + sum(state.gold, "value");
}

export function netWorth(state) {
  return explainNetWorth(state).net_worth;
}

// Section 4
export function explainSafety(state, constants = CONSTANTS) {
  const cost_commitments = commitmentTotal(state, (c) => c.kind === "cost");
  const debt_minimums = debtMinimums(state, constants);
  const essential_burn = state.costs.minimum_living + cost_commitments + debt_minimums;

  const reachable_parts = {
    cash: state.cash,
    cash_at_home: state.cash_at_home,
    liquid_fund: state.liquid_fund,
    fds: sum(state.fds, "value") * (1 - constants.FD_BREAK_PENALTY),
    equity: sum(state.equity, "value") * constants.EQUITY_CRISIS_HAIRCUT,
    small_cap: sum(state.small_cap, "value") * constants.SMALL_CAP_CRISIS_HAIRCUT,
    gold: sum(state.gold, "value") * constants.GOLD_CRISIS_HAIRCUT,
  };
  // Card debt is netted against reachable money (ruled 30 September 2026): money owed on a card
  // is not runway, so a player funding their life on the card does not read as safer. Family
  // money, a 0% loan, is not netted
  const reachable_gross = Object.values(reachable_parts).reduce((a, b) => a + b, 0);
  const card_debt = state.debts.filter((d) => d.type === "card").reduce((total, d) => total + d.principal, 0);
  const reachable = Math.max(0, reachable_gross - card_debt);
  const runway_months = essential_burn > 0 ? reachable / essential_burn : Infinity;

  // Salary at the most recent job, so a layoff does not divide by zero
  const annual_income = MONTHS_PER_YEAR * state.income.salary_net_last_job;

  const runway_component =
    clamp(runway_months / constants.SAFETY_TARGET_MONTHS, 0, 1) * constants.SAFETY_RUNWAY_WEIGHT;
  const health_component =
    clamp(state.cover.health_cover / (annual_income * constants.SAFETY_HEALTH_COVER_MULTIPLE), 0, 1) *
    constants.SAFETY_HEALTH_WEIGHT;
  const term_component =
    state.cover.dependents > 0
      ? clamp(state.cover.term_cover / (annual_income * constants.SAFETY_TERM_COVER_MULTIPLE), 0, 1) *
        constants.SAFETY_TERM_WEIGHT
      : constants.SAFETY_TERM_WEIGHT;

  return {
    minimum_living: state.costs.minimum_living,
    cost_commitments,
    debt_minimums,
    essential_burn,
    reachable_parts,
    reachable_gross,
    card_debt,
    reachable,
    runway_months,
    annual_income,
    runway_component,
    health_component,
    term_component,
    safety: runway_component + health_component + term_component,
  };
}

// Section 4, danger: runway below SAFETY_DANGER_MONTHS. The UI colours the Safety bar
// vermilion while it lasts, whatever the bar did this month. It changes no score.
export function safetyInDanger(state, constants = CONSTANTS) {
  return explainSafety(state, constants).runway_months < constants.SAFETY_DANGER_MONTHS;
}

// Section 5
const LOCKED = new Set(["locked_short", "retirement", "endowment", "tax_product"]);

//
// With no salary, as after the layoff, the ratio is measured against the last salary earned,
// with any other income on top (ruled 27 September 2026). The bar keeps meaning how much of
// the player's pay is spoken for, and still moves on what they do while out of work.
// against_last_salary tells text/ to say so.
export function explainFreedom(state, constants = CONSTANTS) {
  const cost_commitments = commitmentTotal(state, (c) => c.kind === "cost");
  const locked_savings = commitmentTotal(state, (c) => c.kind === "saving" && LOCKED.has(c.destination));
  const debt_minimums = debtMinimums(state, constants);
  const committed = cost_commitments + locked_savings + debt_minimums;
  const income_net = incomeNet(state);
  const against_last_salary = !(state.income.salary_net > 0);
  const income_for_ratio = against_last_salary ? income_net + state.income.salary_net_last_job : income_net;

  const committed_ratio = income_for_ratio > 0 ? committed / income_for_ratio : Infinity;
  const ceiling = constants.FREEDOM_CEILING_RATIO;
  const freedom = income_for_ratio > 0 ? clamp((ceiling - committed_ratio) / ceiling, 0, 1) * BAR_MAX : 0;

  return {
    cost_commitments, locked_savings, debt_minimums, committed, income_net, against_last_salary, income_for_ratio,
    committed_ratio, freedom,
  };
}

// Section 6, the baseline Life drifts toward
//
// The ratio is measured against a fixed yardstick, the starting in-hand salary inflated to
// this month, not against the player's income. Dividing by income made a raise lower the
// baseline, and made a laid-off player with a tiny income, such as a D30 payout, look like
// they spend several times what they earn. The inflation factor is this month's normal
// living against its start, the same index every cost uses (section 2). A player with no
// salary sits at the floor, whatever else comes in.
export function referenceIncome(state, constants = CONSTANTS) {
  return constants.SALARY_NET_START * (state.costs.normal_living / constants.NORMAL_LIVING_START);
}

// Section 6: money the player deliberately put into saving or investment this month. Recurring
// saving paid this month, plus each one-off into saving or investment spread evenly over
// SAVING_ONE_OFF_SPREAD_MONTHS from its decision's month (ruled 27 September 2026, L3-30).
export function savingThisMonth(state, constants = CONSTANTS) {
  const spread = constants.SAVING_ONE_OFF_SPREAD_MONTHS;
  let saving = state.flows.saving_paid;
  for (const s of state.one_off_savings) {
    const age = state.month - s.month;
    if (age >= 0 && age < spread) saving += s.amount / spread;
  }
  return saving;
}

// Section 6: spending above a normal month, shrunk by the share of the yardstick saved, and
// gone once SAVING_FULL_SHARE of it is saved. Plus the leak's share, 0 since step 7.
export function explainDiscretionary(state, leak, constants = CONSTANTS) {
  const spending_above_normal = state.costs.living_costs - state.costs.normal_living;
  const saving_this_month = savingThisMonth(state, constants);
  const reference_income = referenceIncome(state, constants);
  const saved_share = Math.min(1, saving_this_month / (constants.SAVING_FULL_SHARE * reference_income));
  const discretionary_this_month = spending_above_normal * (1 - saved_share) + leak * constants.LEAK_DISCRETIONARY_SHARE;
  return { spending_above_normal, saving_this_month, reference_income, saved_share, discretionary_this_month };
}

export function explainLifeBaseline(state, constants = CONSTANTS) {
  const income_net = incomeNet(state);
  const discretionary_this_month = state.flows.discretionary_this_month;
  const reference_income = referenceIncome(state, constants);
  const has_salary = state.income.salary_net > 0;
  const discretionary_ratio = has_salary ? discretionary_this_month / reference_income : 0;
  const baseline =
    constants.LIFE_BASELINE_FLOOR +
    clamp(discretionary_ratio / constants.DISCRETIONARY_TARGET, 0, 1) * constants.LIFE_DISCRETIONARY_WEIGHT;
  return { discretionary_this_month, income_net, reference_income, has_salary, discretionary_ratio, baseline };
}

// Section 6, one month of Life: add this month's effects, then drift toward the baseline
export function updateLife(state, constants = CONSTANTS) {
  const { baseline } = explainLifeBaseline(state, constants);
  const before = state.life_score;
  const after_effects = before + state.flows.life_effects;
  const drifted = after_effects + constants.LIFE_DRIFT * (baseline - after_effects);
  const life = clamp(drifted, 0, BAR_MAX);
  return { before, life_effects: state.flows.life_effects, baseline, after_effects, life };
}

export function explainBars(state, constants = CONSTANTS) {
  return {
    net_worth: explainNetWorth(state),
    safety: explainSafety(state, constants),
    freedom: explainFreedom(state, constants),
    life: { life_score: state.life_score, baseline: explainLifeBaseline(state, constants) },
  };
}

// For the month close: each bar at the start and the end, and how far it moved. The UI
// shows the change and never works it out itself (UI.md build rule 1).
export function compareBars(before, after) {
  const compared = {};
  for (const key of ["netWorth", "safety", "freedom", "life"]) {
    compared[key] = { before: before[key], after: after[key], change: after[key] - before[key] };
  }
  return compared;
}

// Where Home draws each bar's good mark, 0 to 100 (ruled 30 September 2026, ONBOARDING.md
// section 5). Safety: the good runway with health and term cover full, through the section 4
// formula. Freedom: the good committed share through the section 5 formula. Life: the
// middle of its baseline, section 6. Display only: no score reads them.
export function barMarks(constants = CONSTANTS) {
  const safety =
    clamp(constants.SAFETY_GOOD_MONTHS / constants.SAFETY_TARGET_MONTHS, 0, 1) * constants.SAFETY_RUNWAY_WEIGHT +
    constants.SAFETY_HEALTH_WEIGHT +
    constants.SAFETY_TERM_WEIGHT;
  const ceiling = constants.FREEDOM_CEILING_RATIO;
  const freedom = clamp((ceiling - constants.FREEDOM_GOOD_COMMITTED) / ceiling, 0, 1) * BAR_MAX;
  return { safety, freedom, life: constants.LIFE_GOOD };
}

export function getBars(state, constants = CONSTANTS) {
  const w = explainBars(state, constants);
  return {
    netWorth: w.net_worth.net_worth,
    safety: w.safety.safety,
    freedom: w.freedom.freedom,
    life: state.life_score,
  };
}
