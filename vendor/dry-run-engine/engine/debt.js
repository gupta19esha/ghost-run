// Debt amortisation, SIMULATION-MATHS.md section 8:
//
//   interest_this_month = principal × monthly_rate
//   principal -= (payment - interest_this_month)
//
// A card pays its minimum, the opening balance × CARD_MIN_PAYMENT_PCT, and clears in full once
// its balance is below CARD_MINIMUM_FLOOR. A loan or EMI pays its scheduled payment, and its
// last payment clears whatever is left, so no rounding residue survives the term. Debts are
// paid at step 3 of the month (section 2), from the month after they open.

import CONSTANTS from "./constants.js";

const RATE_SEARCH_STEPS = 200;

export function monthlyRate(type, constants = CONSTANTS) {
  const rates = {
    card: constants.CARD_MONTHLY_RATE,
    personal_loan: constants.PERSONAL_LOAN_MONTHLY_RATE,
    two_wheeler_loan: constants.TWO_WHEELER_LOAN_MONTHLY_RATE,
    home_loan: constants.HOME_LOAN_MONTHLY_RATE,
  };
  if (rates[type] === undefined) throw new Error(`No monthly rate for debt type ${JSON.stringify(type)} in section 12`);
  return rates[type];
}

// The level payment that clears principal in `months` at `rate`. Powers by repeated
// multiplication, never Math.pow (ENGINE.md rule 3).
export function scheduledPayment(principal, rate, months) {
  if (!Number.isInteger(months) || months < 1) throw new Error(`A loan needs a whole number of months, got ${months}`);
  if (rate === 0) return principal / months;
  let growth = 1;
  for (let i = 0; i < months; i++) growth *= 1 + rate;
  return (principal * rate * growth) / (growth - 1);
}

// Section 8, EMI purchases: the monthly rate at which the stated payment clears the price in
// the stated months. Found by halving the interval, which uses only + - × ÷.
export function impliedMonthlyRate(principal, payment, months) {
  if (payment * months < principal) {
    throw new Error(`${months} payments of ${payment} do not cover ${principal}`);
  }
  if (payment * months === principal) return 0;
  let low = 0;
  let high = 1;
  for (let i = 0; i < RATE_SEARCH_STEPS; i++) {
    const mid = (low + high) / 2;
    if (scheduledPayment(principal, mid, months) < payment) low = mid;
    else high = mid;
  }
  return low;
}

// The player's one card debt, opened at 0 if there is none yet. Payments start the month after.
export function cardDebt(state, openedBy) {
  let card = state.debts.find((d) => d.type === "card");
  if (!card) {
    card = { type: "card", opened_by: openedBy, principal: 0, months_remaining: 0, payment: 0, starts_month: state.month + 1 };
    state.debts.push(card);
  }
  return card;
}

function rateFor(debt, constants) {
  return debt.monthly_rate !== undefined ? debt.monthly_rate : monthlyRate(debt.type, constants);
}

// Step 3: every debt accrues its month's interest and takes its payment from cash
export function payDebts(state, constants, events) {
  const kept = [];
  for (const debt of state.debts) {
    if (debt.starts_month !== undefined && state.month < debt.starts_month) {
      kept.push(debt);
      continue;
    }
    const opening = debt.principal;
    const interest = opening * rateFor(debt, constants);
    let payment;
    if (debt.type === "card") {
      payment = opening < constants.CARD_MINIMUM_FLOOR
        ? opening + interest
        : Math.min(opening * constants.CARD_MIN_PAYMENT_PCT, opening + interest);
    } else {
      payment = debt.months_remaining === 1 ? opening + interest : Math.min(debt.payment, opening + interest);
      debt.months_remaining -= 1;
    }
    debt.principal = opening + interest - payment;
    state.cash -= payment;
    state.flows.cash_out += payment;
    events.push({ type: "debt_paid", debt_type: debt.type, opened_by: debt.opened_by, interest, payment, principal: debt.principal });

    const cleared = debt.principal <= 0 || (debt.type !== "card" && debt.months_remaining <= 0);
    if (cleared) events.push({ type: "debt_cleared", debt_type: debt.type, opened_by: debt.opened_by });
    else kept.push(debt);
  }
  state.debts = kept;
}
