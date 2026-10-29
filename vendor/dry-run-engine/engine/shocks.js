// Shocks, SIMULATION-MATHS.md section 9.
//
// The layoff: scripted by the sheet (the decision whose shock is "layoff"). At step 1 of that
// month salary stops, salary changes such as raises fold into the salary it restarts at, and
// LAYOFF_SEVERANCE_MONTHS of that salary is paid as severance. A D29 option restarts salary.
//
// The payment cascade: at step 8 of any month that ends with cash below zero, the shortfall
// is raised in five steps, stopping as soon as it is covered. A D28-C player first puts the
// month's gap on the card while unemployed.

import CONSTANTS from "./constants.js";
import DECISIONS from "./decisions.js";
import { cardDebt } from "./debt.js";

function layoffMonth(decisions) {
  const layoff = Object.values(decisions).find((d) => d.shock === "layoff");
  return layoff ? layoff.month : null;
}

// Step 1, before salary is paid
export function applyEmployment(state, constants, events, decisions = DECISIONS) {
  const employment = state.employment;

  if (employment.employed && state.month === layoffMonth(decisions)) {
    const salaryChanges = state.commitments.filter((c) => c.kind === "income" && c.salary_change);
    const salary = state.income.salary_net + salaryChanges.reduce((total, c) => total + c.amount, 0);
    state.commitments = state.commitments.filter((c) => !salaryChanges.includes(c));
    state.income.salary_net_last_job = salary;
    state.income.salary_net = 0;
    employment.employed = false;
    employment.laid_off_month = state.month;

    const severance = salary * constants.LAYOFF_SEVERANCE_MONTHS;
    state.cash += severance;
    state.flows.cash_in += severance;
    events.push({ type: "layoff", month: state.month, salary_lost: salary, severance, salary_changes_folded: salaryChanges.map((c) => c.opened_by) });
    return;
  }

  if (!employment.employed && employment.restart_month !== null && state.month >= employment.restart_month) {
    state.income.salary_net = state.income.salary_net_last_job;
    employment.employed = true;
    events.push({ type: "salary_restarted", month: state.month, salary: state.income.salary_net });
  }
}

function byAge(a, b) {
  return a.month_opened - b.month_opened;
}

function cardRoom(state, constants) {
  const card = state.debts.find((d) => d.type === "card");
  return Math.max(constants.CARD_LIMIT - (card ? card.principal : 0), 0);
}

// Step 8, before the cascade. D28-C: while unemployed, the month's gap (money out less money
// in) goes on the card instead of coming out of the player's money, up to CARD_LIMIT.
export function putGapOnCard(state, constants, events) {
  if (!state.card_takes_gap || !state.has_card || state.employment.employed) return 0;
  const gap = state.flows.cash_out - state.flows.cash_in;
  const borrow = Math.min(Math.max(gap, 0), cardRoom(state, constants));
  if (borrow <= 0) return 0;
  cardDebt(state, "D28-C").principal += borrow;
  state.cash += borrow;
  events.push({ type: "gap_on_card", month: state.month, gap, amount: borrow });
  return borrow;
}

// Step 8
export function runCascade(state, constants, events) {
  const gapOnCard = putGapOnCard(state, constants, events);
  if (gapOnCard > 0) state.flows.cascade_deepest_step = 4;
  if (state.cash >= 0) return;
  const shortfall = -state.cash;
  let need = shortfall;
  const steps = [];
  const take = (step, source, amount, detail = {}) => {
    if (amount <= 0) return;
    state.cash += amount;
    need -= amount;
    steps.push({ step, source, amount, ...detail });
  };

  // 1. Cash at home and the liquid fund
  for (const field of ["cash_at_home", "liquid_fund"]) {
    if (need <= 0) break;
    const amount = Math.min(need, Math.max(state[field], 0));
    state[field] -= amount;
    take(1, field, amount);
  }

  // 2. Break fixed deposits, oldest first. A deposit breaks whole, less FD_BREAK_PENALTY.
  const fds = [...state.fds].sort(byAge);
  while (need > 0 && fds.length > 0) {
    const fd = fds.shift();
    const penalty = fd.value * constants.FD_BREAK_PENALTY;
    state.fds = state.fds.filter((f) => f !== fd);
    take(2, `fd:${fd.opened_by}`, fd.value - penalty, { penalty });
  }

  // 3. Sell gold, then equity, then small caps, oldest holding first, only as much as needed
  for (const bucket of ["gold", "equity", "small_cap"]) {
    for (const holding of [...state[bucket]].sort(byAge)) {
      if (need <= 0) break;
      const sale = Math.min(need, holding.value);
      const remaining = holding.value - sale;
      holding.contributed = holding.value > 0 ? holding.contributed * (remaining / holding.value) : 0;
      holding.value = remaining;
      if (remaining <= 0) state[bucket] = state[bucket].filter((h) => h !== holding);
      take(3, `${bucket}:${holding.opened_by}`, sale);
    }
  }

  // 4. The credit card, for a card holder, up to CARD_LIMIT
  if (need > 0 && state.has_card) {
    const borrow = Math.min(need, cardRoom(state, constants));
    if (borrow > 0) {
      cardDebt(state, "cascade").principal += borrow;
      take(4, "card", borrow);
    }
  }

  // 5. Family covers the rest: a 0% debt repaid over FAMILY_REPAYMENT_MONTHS from next month.
  // The Life penalty lands once per episode, a run of consecutive months reaching step 5.
  if (need > 0) {
    const amount = need;
    const newEpisode = state.family_last_month !== state.month - 1;
    const lifePenalty = newEpisode ? constants.FAMILY_LIFE_PENALTY : 0;
    take(5, "family", amount, { life_penalty: lifePenalty });
    state.flows.life_effects -= lifePenalty;
    state.family_last_month = state.month;
    state.debts.push({
      type: "family",
      opened_by: `family-${state.month}`,
      principal: amount,
      monthly_rate: 0,
      payment: amount / constants.FAMILY_REPAYMENT_MONTHS,
      months_remaining: constants.FAMILY_REPAYMENT_MONTHS,
      starts_month: state.month + 1,
    });
  }

  const deepest = steps.reduce((max, s) => Math.max(max, s.step), gapOnCard > 0 ? 4 : 0);
  state.flows.cascade_deepest_step = deepest;
  events.push({ type: "cascade", month: state.month, shortfall, deepest_step: deepest, steps });
}
