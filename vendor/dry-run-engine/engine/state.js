// The ledger state from SIMULATION-MATHS.md section 2.

import CONSTANTS from "./constants.js";
import { emptyPendingFlows } from "./apply.js";

// Section 2 monthly flows, reset at the start of every month.
export function emptyFlows() {
  return {
    cash_in: 0,
    cash_out: 0,
    income_net: 0,
    leak: 0,
    discretionary_this_month: 0,
    // Section 6: recurring saving paid this month, and all deliberate saving counted this
    // month once one-offs are spread
    saving_paid: 0,
    saving_this_month: 0,
    cash_interest: 0,
    retirement_credit: 0,
    life_effects: 0,
    cascade_deepest_step: 0,
  };
}

export function createState(seed, constants = CONSTANTS) {
  return {
    seed,
    month: 1,
    age: constants.AGE_START,

    income: {
      salary_gross: constants.SALARY_GROSS_START,
      salary_net: constants.SALARY_NET_START,
      // Section 4: annual income uses the most recent job's salary, so a layoff does not divide by zero
      salary_net_last_job: constants.SALARY_NET_START,
      bonus_pending: 0,
    },
    costs: {
      living_costs: constants.LIVING_COSTS_START,
      normal_living: constants.NORMAL_LIVING_START,
      minimum_living: constants.MINIMUM_LIVING_START,
      // Section 2: multiplied by (1 + INFLATION_MONTHLY_RATE) once a month. No fractional
      // powers, which round differently across JavaScript engines (ENGINE.md rule 3).
      inflation_index: 1,
    },

    // The sheet README starts net worth at 0. With no holdings, that is all cash.
    cash: constants.NET_WORTH_START,
    cash_at_home: 0,
    liquid_fund: 0,
    // Each fixed-term deposit: { opened_by, month_opened, value, maturity_month }. Section 2.
    fds: [],
    retirement_fund: 0,
    retirement_interest_accrued: 0,
    endowment_balance: 0,
    tax_product_balance: 0,

    equity: [],
    gold: [],
    small_cap: [],
    assets: [],
    // Each debt: { type: "card" | "personal_loan" | "two_wheeler_loan" | "home_loan",
    //   principal, monthly_rate, months_remaining, payment }. Section 8.
    debts: [],

    cover: { health_cover: constants.HEALTH_COVER_START, term_cover: 0, dependents: 0 },
    // Section 9: the layoff stops salary, a D29 option restarts it
    employment: { employed: true, laid_off_month: null, restart_month: null },
    // Section 9 step 4: only a player who took a card (grants_card) can borrow on one
    has_card: false,
    // Section 9: a D28-C player puts each month's gap on the card while unemployed
    card_takes_gap: false,
    // Section 9 step 5: the last month family covered a gap, so the Life penalty lands once
    // per episode
    family_last_month: null,
    commitments: [],
    // Section 6: each one-off an option put into saving or investment, { opened_by, amount,
    // month }. Spread over SAVING_ONE_OFF_SPREAD_MONTHS, it lowers the Life baseline.
    one_off_savings: [],
    pending_callbacks: [],
    decisions_taken: {},
    // Section 10.1: savedTotal just before each decision, for {total_saved}
    saved_before: {},
    // Cash flows and Life effects from decisions made this month, folded in at step 5
    pending_flows: emptyPendingFlows(),

    flows: emptyFlows(),

    life_score: constants.LIFE_SCORE_START,
    knowledge: [],

    history: [],
  };
}
