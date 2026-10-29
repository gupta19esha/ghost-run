// The monthly order of operations from SIMULATION-MATHS.md section 2, one function per
// step.

import CONSTANTS from "./constants.js";
import { emptyFlows } from "./state.js";
import { incomeNet, netWorth, updateLife, getBars, explainDiscretionary } from "./bars.js";
import { payCommitments, takeDueCallbacks, applyCallback, emptyPendingFlows } from "./apply.js";
import { canEmpty, nothingLeft, readTokens, deferredTemplate } from "./token-figures.js";
import { monthlyReturn } from "./market.js";
import { payDebts } from "./debt.js";
import { applyEmployment, runCascade } from "./shocks.js";

const MONTHS_PER_YEAR = 12;

function depreciationRates(assetType, constants) {
  const table = {
    phone: { annual: constants.PHONE_DEPRECIATION_ANNUAL, floor: constants.PHONE_VALUE_FLOOR },
    two_wheeler: { annual: constants.TWO_WHEELER_DEPRECIATION_ANNUAL, floor: constants.TWO_WHEELER_VALUE_FLOOR },
    car: { annual: constants.CAR_DEPRECIATION_ANNUAL, floor: constants.CAR_VALUE_FLOOR },
  };
  if (!table[assetType]) {
    throw new Error(`No depreciation constants for asset_type ${JSON.stringify(assetType)} in section 12`);
  }
  return table[assetType];
}

// 1. Salary in. The layoff and a salary restart take effect first (section 9).
export function salaryIn(state, constants, events) {
  applyEmployment(state, constants, events);
  const amount = state.income.salary_net;
  if (amount > 0) state.income.salary_net_last_job = amount;
  state.cash += amount;
  state.flows.cash_in += amount;
  events.push({ type: "salary_in", amount });
}

// For the UI's month card, before the month runs: the in-hand salary this month will pay,
// with raises and other salary changes that are running this month. The layoff and a
// salary restart are applied first, on a copy, exactly as step 1 will apply them.
export function salaryThisMonth(state, constants = CONSTANTS) {
  const copy = structuredClone(state);
  applyEmployment(copy, constants, []);
  const changes = copy.commitments
    .filter((c) => c.kind === "income" && c.salary_change && c.starts_month <= copy.month && !(c.paused_months > 0))
    .reduce((total, c) => total + c.amount, 0);
  return copy.income.salary_net > 0 ? copy.income.salary_net + changes : 0;
}

// 2. Statutory deductions out
// salary_net is the in-hand figure, already after tax and the employee contribution, so no
// cash leaves here. The retirement credit uses UNVERIFIED placeholder constants (section 14).
export function statutoryDeductions(state, constants, events) {
  if (state.income.salary_net <= 0) return;
  const amount = constants.RETIREMENT_CONTRIBUTION_MONTHLY;
  state.retirement_fund += amount;
  events.push({ type: "retirement_contribution", amount, unverified: true });
}

// 3. Fixed commitments out, section 2 and section 10 rules 3, 17 and 18, then debt
// payments, section 8
export function fixedCommitments(state, constants, events) {
  payCommitments(state, constants, events);
  payDebts(state, constants, events);
}

// 4. Living costs out. Three tiers, all inflated by the same index (section 2).
export function livingCostsOut(state, constants, events) {
  const index = state.costs.inflation_index;
  const living = constants.LIVING_COSTS_START * index;
  state.costs.living_costs = living;
  state.costs.normal_living = constants.NORMAL_LIVING_START * index;
  state.costs.minimum_living = constants.MINIMUM_LIVING_START * index;
  state.cash -= living;
  state.flows.cash_out += living;
  events.push({ type: "living_costs_out", amount: living });
}

// 5. Apply the player's decisions for this month. applyDecision has already changed the
// balances. Here its cash flows and Life effects join this month's flows.
export function applyDecisions(state, constants, events) {
  state.flows.cash_in += state.pending_flows.cash_in;
  state.flows.cash_out += state.pending_flows.cash_out;
  state.flows.life_effects += state.pending_flows.life_effects;
  state.pending_flows = emptyPendingFlows();
}

// 6. Apply any deferred callbacks landing this month
// Section 10 rule 28: a callback whose text would have nothing left does not show, and
// nothing it carries is applied. Whether anything is left depends on the end of this month,
// so a copy of the state runs the rest of the month with the callback applied, and the text
// is read there, as the player would have seen it.
export function applyCallbacks(state, constants, events) {
  for (const callback of takeDueCallbacks(state)) {
    if (callbackShows(state, callback, constants)) {
      applyCallback(state, callback, events);
    } else {
      events.push({ type: "callback_skipped", opened_by: callback.opened_by, decision_id: callback.decision_id, reason: "no text left" });
    }
  }
}

function callbackShows(state, callback, constants) {
  const template = deferredTemplate(callback);
  if (!canEmpty(template)) return true;
  const trial = structuredClone(state);
  applyCallback(trial, callback, []);
  const rest = MONTHLY_STEPS.slice(MONTHLY_STEPS.indexOf(applyCallbacks) + 1);
  for (const step of rest) step(trial, constants, []);
  const values = readTokens(trial, { owner: callback.opened_by, savedFrom: callback.decision_id }, constants);
  return !nothingLeft(template, values);
}

// 7. Apply returns to all balances. Annual rates convert as annual / 12 (section 7).
// Market-linked holdings and the liquid fund arrive in ENGINE.md step 4.
export function applyReturns(state, constants, events) {
  // Market-linked balances, section 7. Every holding in a bucket earns that bucket's return.
  const marketReturns = {};
  for (const bucket of ["equity", "small_cap", "gold"]) {
    if (state[bucket].length === 0) continue;
    const r = monthlyReturn(state.seed, bucket, state.month, constants);
    marketReturns[bucket] = r;
    for (const holding of state[bucket]) holding.value += holding.value * r;
  }
  if (state.liquid_fund !== 0) {
    const r = monthlyReturn(state.seed, "liquid", state.month, constants);
    marketReturns.liquid = r;
    state.liquid_fund += state.liquid_fund * r;
  }
  if (Object.keys(marketReturns).length > 0) events.push({ type: "market_returns", month: state.month, ...marketReturns });

  const cashInterest = Math.max(state.cash, 0) * constants.SAVINGS_ANNUAL_RATE / MONTHS_PER_YEAR;
  state.cash += cashInterest;
  // cash_at_home earns 0%, section 2 step 7

  // Each deposit earns FD_ANNUAL_RATE, counting its opening month. One reaching its maturity
  // month moves to cash before that month's interest, so a twelve month deposit earns twelve
  // months. Matured money is not income, so it is not in the section 2.1 cash_in.
  let fdInterest = 0;
  const unmatured = [];
  for (const fd of state.fds) {
    if (fd.maturity_month !== null && state.month >= fd.maturity_month) {
      state.cash += fd.value;
      events.push({ type: "fd_matured", opened_by: fd.opened_by, amount: fd.value });
      continue;
    }
    const interest = fd.value * constants.FD_ANNUAL_RATE / MONTHS_PER_YEAR;
    fd.value += interest;
    fdInterest += interest;
    unmatured.push(fd);
  }
  state.fds = unmatured;

  // The endowment and the tax product each earn their own rate. The tax product rate is UNVERIFIED.
  const endowmentInterest = state.endowment_balance * constants.ENDOWMENT_EFFECTIVE_RETURN / MONTHS_PER_YEAR;
  state.endowment_balance += endowmentInterest;
  const taxProductInterest = state.tax_product_balance * constants.TAX_PRODUCT_ANNUAL_RATE / MONTHS_PER_YEAR;
  state.tax_product_balance += taxProductInterest;

  // Section 3: straight-line depreciation to a floor, by asset_type
  for (const asset of state.assets) {
    if (asset.asset_type === "deposit") continue;
    const rates = depreciationRates(asset.asset_type, constants);
    const monthsHeld = state.month - asset.month_acquired;
    asset.current_value = Math.max(
      asset.purchase_price * (1 - rates.annual * monthsHeld / MONTHS_PER_YEAR),
      asset.purchase_price * rates.floor,
    );
  }

  // Retirement interest accrues monthly and is credited every 12th month. UNVERIFIED rate.
  state.retirement_interest_accrued += state.retirement_fund * constants.RETIREMENT_ANNUAL_RATE / MONTHS_PER_YEAR;
  let retirementCredit = 0;
  if (state.month % MONTHS_PER_YEAR === 0) {
    retirementCredit = state.retirement_interest_accrued;
    state.retirement_fund += retirementCredit;
    state.retirement_interest_accrued = 0;
  }

  state.flows.cash_interest = cashInterest;
  state.flows.retirement_credit = retirementCredit;
  events.push({
    type: "returns", cash: cashInterest, fd: fdInterest, endowment: endowmentInterest,
    tax_product: taxProductInterest, retirement_credit: retirementCredit,
  });
}

// 8. Resolve any shock: the payment cascade covers any month that ends with cash below zero
export function resolveShock(state, constants, events) {
  runCascade(state, constants, events);
}

// 9. Leak unallocated cash, section 2.1
export function leakUnallocatedCash(state, constants, events) {
  const unallocated = Math.max(0, state.flows.cash_in - state.flows.cash_out);
  const leak = unallocated * constants.CASH_LEAK_RATE;
  state.cash -= leak;
  state.flows.leak = leak;
  state.flows.income_net = incomeNet(state);
  // Section 6: discretionary is spending above a normal month, less what the player
  // deliberately saved, plus only a share of the leak. Money that dribbles away is lost to Net
  // Worth, not spent on a life.
  const discretionary = explainDiscretionary(state, leak, constants);
  state.flows.saving_this_month = discretionary.saving_this_month;
  state.flows.discretionary_this_month = discretionary.discretionary_this_month;
  events.push({ type: "cash_leaked", amount: leak, unallocated });
}

// 10. Recompute all four bars. Life is a stock that moves once a month (section 6).
// Net Worth, Safety and Freedom are read straight from the ledger.
export function recomputeBars(state, constants, events) {
  const life = updateLife(state, constants);
  state.life_score = life.life;
  state.flows.life_baseline = life.baseline;
  const bars = getBars(state, constants);
  state.flows.bars = bars;
  events.push({ type: "bars", ...bars });
}

// 11. Write the month to history
export function writeHistory(state, constants, events) {
  for (const bucket of ["equity", "gold", "small_cap"]) {
    for (const holding of state[bucket]) {
      holding.history.push({ month: state.month, value: holding.value, contributed: holding.contributed });
    }
  }
  state.history.push({
    month: state.month,
    age: state.age,
    salary_in: state.flows.cash_in,
    retirement_contribution: state.income.salary_net > 0 ? constants.RETIREMENT_CONTRIBUTION_MONTHLY : 0,
    cash_interest: state.flows.cash_interest,
    retirement_credit: state.flows.retirement_credit,
    living_costs: state.costs.living_costs,
    normal_living: state.costs.normal_living,
    minimum_living: state.costs.minimum_living,
    leak: state.flows.leak,
    income_net: state.flows.income_net,
    saving_this_month: state.flows.saving_this_month,
    discretionary_this_month: state.flows.discretionary_this_month,
    cash: state.cash,
    retirement_fund: state.retirement_fund,
    net_worth: netWorth(state),
    safety: state.flows.bars.safety,
    freedom: state.flows.bars.freedom,
    life: state.flows.bars.life,
    life_baseline: state.flows.life_baseline,
    employed: state.employment.employed,
    cascade_deepest_step: state.flows.cascade_deepest_step,
  });
}

export const MONTHLY_STEPS = [
  salaryIn,
  statutoryDeductions,
  fixedCommitments,
  livingCostsOut,
  applyDecisions,
  applyCallbacks,
  applyReturns,
  resolveShock,
  leakUnallocatedCash,
  recomputeBars,
  writeHistory,
];

export function advanceMonth(state, constants = CONSTANTS) {
  const next = structuredClone(state);
  next.flows = emptyFlows();
  const events = [];
  for (const step of MONTHLY_STEPS) step(next, constants, events);
  next.costs.inflation_index *= 1 + constants.INFLATION_MONTHLY_RATE;
  next.month += 1;
  next.age = constants.AGE_START + Math.floor((next.month - 1) / MONTHS_PER_YEAR);
  return { state: next, events };
}

export function getHistory(state) {
  return state.history.map((row) => ({ ...row }));
}
