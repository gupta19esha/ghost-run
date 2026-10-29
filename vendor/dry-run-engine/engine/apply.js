// Applying a decision: SIMULATION-MATHS.md section 10, rules 1 to 23.
// applyDecision changes balances straight away and records its cash flows in
// pending_flows, which step 5 of the month folds into that month's flows.

import CONSTANTS from "./constants.js";
import DECISIONS from "./decisions.js";
import { getBars, savedTotal } from "./bars.js";
import { impliedMonthlyRate, cardDebt } from "./debt.js";
import { optionOffered } from "./content.js";

const HOLDING_BUCKETS = new Set(["equity", "gold", "small_cap"]);
const BALANCE_FIELD = {
  cash: "cash",
  cash_at_home: "cash_at_home",
  liquid: "liquid_fund",
  retirement: "retirement_fund",
  endowment: "endowment_balance",
  tax_product: "tax_product_balance",
};
const CLASSES = new Set([...Object.keys(BALANCE_FIELD), ...HOLDING_BUCKETS, "locked_short", "illiquid", "spent"]);
const KINDS = new Set(["cost", "saving", "income"]);
const BOUGHT_ASSET_TYPES = new Set(["phone", "two_wheeler", "car", "other"]);
// Section 6: money put into any of these by choice is deliberate saving, which lowers the Life
// baseline. Not spent money, and not illiquid, which is a deposit or a bought asset.
export const SAVING_CLASSES = new Set([...Object.keys(BALANCE_FIELD), ...HOLDING_BUCKETS, "locked_short"]);

export function emptyPendingFlows() {
  return { cash_in: 0, cash_out: 0, life_effects: 0 };
}

function checkClass(cls, where) {
  if (!CLASSES.has(cls)) throw new Error(`${where}: unknown liquidity class ${JSON.stringify(cls)}`);
}

function holdingFor(state, bucket, openedBy) {
  let holding = state[bucket].find((h) => h.opened_by === openedBy);
  if (!holding) {
    holding = { opened_by: openedBy, month_opened: state.month, value: 0, contributed: 0, history: [] };
    state[bucket].push(holding);
  }
  return holding;
}

// Section 2: each deposit into locked_short is its own entry, maturing at the decision's
// month plus term_months (rule 23). No term means it never matures.
function depositFor(state, openedBy, deposit) {
  let fd = state.fds.find((f) => f.opened_by === openedBy);
  if (!fd) {
    const maturity_month = deposit.termMonths ? deposit.decisionMonth + deposit.termMonths : null;
    fd = { opened_by: openedBy, month_opened: state.month, value: 0, maturity_month };
    state.fds.push(fd);
  }
  return fd;
}

// Rules 1, 2, 3, 4 and 6. A negative amount moves cash into the class, a positive amount
// arrives in cash. Every movement counts in the month's cash flows for the leak (section 2.1),
// including a transfer into cash.
export function moveMoney(state, { amount, cls, holdingOwner, flows, events, source, deposit = {}, asset = null }) {
  if (!amount) return;
  checkClass(cls, source);
  if (amount > 0 && cls !== "cash") {
    throw new Error(`${source}: a positive amount arrives in cash (rule 4), not ${cls}`);
  }
  state.cash += amount;
  if (amount > 0) {
    flows.cash_in += amount;
  } else {
    flows.cash_out -= amount;
    const into = -amount;
    if (BALANCE_FIELD[cls]) {
      state[BALANCE_FIELD[cls]] += into;
    } else if (cls === "locked_short") {
      depositFor(state, holdingOwner, deposit).value += into;
    } else if (HOLDING_BUCKETS.has(cls)) {
      const holding = holdingFor(state, cls, holdingOwner);
      holding.value += into;
      holding.contributed += into;
    } else if (cls === "illiquid") {
      if (!asset) throw new Error(`${source}: illiquid money needs an asset_type (rule 22)`);
      if (asset.asset_type === "deposit") {
        // Rule 12: a deposit does not depreciate
        state.assets.push({ opened_by: source, asset_type: "deposit", purchase_price: into, month_acquired: state.month, current_value: into });
      }
      // Any other asset_type: this money pays for the asset rule 10 creates.
    }
    // "spent" leaves the ledger.
  }
  events.push({ type: "money_moved", source, amount, class: cls });
}

// Rules 7 and 19: a deferred one-off hits its bucket, not cash, and a removal is capped at
// what the bucket holds. The event reports both the amount asked and the amount applied.
function applyDeferredOnce(state, callback, flows, events) {
  const { def_money_once: amount, def_liquidity_class: cls, opened_by: source } = callback;
  if (!amount) return;
  checkClass(cls, `${source} callback`);
  if (cls === "cash") {
    state.cash += amount;
    if (amount > 0) flows.cash_in += amount;
    else flows.cash_out -= amount;
    events.push({ type: "deferred_money", source, amount, class: cls, applied: amount });
    return;
  }
  if (amount > 0 && HOLDING_BUCKETS.has(cls)) {
    throw new Error(`${source}: positive def_money_once into ${cls} double counts section 7 returns (rule 8)`);
  }
  // 0 - x rather than -x, so removing nothing gives 0, not -0
  const removeFrom = (current) => (amount < 0 ? 0 - Math.min(-amount, Math.max(current, 0)) : amount);
  let applied;
  if (BALANCE_FIELD[cls]) {
    const field = BALANCE_FIELD[cls];
    applied = removeFrom(state[field]);
    state[field] += applied;
  } else if (cls === "locked_short") {
    const fd = state.fds.find((f) => f.opened_by === source);
    applied = removeFrom(fd ? fd.value : 0);
    if (fd) fd.value += applied;
  } else if (HOLDING_BUCKETS.has(cls)) {
    const holding = state[cls].find((h) => h.opened_by === source);
    applied = removeFrom(holding ? holding.value : 0);
    if (holding) holding.value += applied;
  } else {
    throw new Error(`${source}: deferred money into ${cls} is not defined in section 10`);
  }
  events.push({ type: "deferred_money", source, amount, class: cls, applied, shortfall: amount - applied });
}

function openCommitment(state, { amount, destination, months, kind, openedBy, startsMonth, termMonths, salaryChange = false, events }) {
  if (!amount) return;
  if (!KINDS.has(kind)) throw new Error(`${openedBy}: commitment kind ${JSON.stringify(kind)} is not cost, saving or income`);
  checkClass(destination, openedBy);
  const commitment = {
    amount,
    months_remaining: months || 0, // 0 means permanent, section 2
    destination,
    opened_by: openedBy,
    holding_opened_by: openedBy,
    kind,
    opened_month: state.month,
    starts_month: startsMonth,
    term_months: termMonths || null,
    paused_months: 0,
    salary_change: salaryChange,
  };
  state.commitments.push(commitment);
  events.push({ type: "commitment_opened", ...commitment });
}

// Step 3. A commitment pays from starts_month, skips while paused, and ends after its last payment.
export function payCommitments(state, constants, events) {
  const kept = [];
  for (const c of state.commitments) {
    if (state.month < c.starts_month) {
      kept.push(c);
      continue;
    }
    if (c.paused_months > 0) {
      c.paused_months -= 1;
      kept.push(c);
      events.push({ type: "commitment_paused", opened_by: c.opened_by, paused_months_left: c.paused_months });
      continue;
    }
    moveMoney(state, {
      amount: c.amount, cls: c.destination, holdingOwner: c.holding_opened_by,
      flows: state.flows, events, source: c.opened_by,
      deposit: { termMonths: c.term_months, decisionMonth: c.opened_month },
    });
    // Section 6: recurring saving this month, whatever its destination
    if (c.kind === "saving" && c.amount < 0) state.flows.saving_paid -= c.amount;
    if (c.months_remaining === 0) {
      kept.push(c);
    } else {
      c.months_remaining -= 1;
      if (c.months_remaining > 0) kept.push(c);
      else events.push({ type: "commitment_ended", opened_by: c.opened_by, kind: c.kind });
    }
  }
  state.commitments = kept;
}

// Step 6: the callbacks landing this month, removed from the queue
export function takeDueCallbacks(state) {
  const due = state.pending_callbacks.filter((c) => c.month === state.month);
  state.pending_callbacks = state.pending_callbacks.filter((c) => c.month !== state.month);
  return due;
}

export function applyCallback(state, callback, events) {
  events.push({ type: "callback", opened_by: callback.opened_by, decision_id: callback.decision_id });
  applyDeferredOnce(state, callback, state.flows, events);
  // Rule 21: a monthly amount opened by a callback starts the month after
  openCommitment(state, {
    amount: callback.def_money_monthly, destination: callback.def_monthly_destination,
    months: callback.def_commitment_months, kind: callback.commitment_kind,
    openedBy: callback.opened_by, startsMonth: state.month + 1, salaryChange: callback.salary_change, events,
  });
  state.flows.life_effects += callback.def_life || 0;
}

// Rule 17
// Rule 17 acts on the target's saving commitments only: stopping or redirecting an investment
// leaves a spending commitment the same option opened alone, such as D27-C's comfort half
function modifyCommitments(state, option, events) {
  for (const target of option.modifies_commitment) {
    const found = state.commitments.filter((c) => c.opened_by === target && c.kind === "saving");
    if (found.length === 0) {
      events.push({ type: "modification_no_effect", target, by: option.option_id });
      continue;
    }
    for (const c of found) {
      if (option.monthly_destination) {
        if (option.commitment_months) {
          throw new Error(`${option.option_id}: a temporary redirect is not defined in section 10`);
        }
        checkClass(option.monthly_destination, option.option_id);
        c.destination = option.monthly_destination;
        c.holding_opened_by = option.option_id;
        events.push({ type: "commitment_redirected", target, by: option.option_id, destination: c.destination });
      } else if (option.commitment_months) {
        c.paused_months = option.commitment_months;
        events.push({ type: "commitment_paused_by", target, by: option.option_id, months: c.paused_months });
      } else {
        state.commitments = state.commitments.filter((x) => x !== c);
        events.push({ type: "commitment_cancelled", target, by: option.option_id });
      }
    }
  }
}

// Section 9: a card balance spent on things already enjoyed. It opens no asset, and the
// minimum is paid from the month after.
function addToCard(state, amount, openedBy, constants) {
  if (!state.has_card) throw new Error(`${openedBy}: card_balance needs a card (grants_card)`);
  const debt = cardDebt(state, openedBy);
  if (debt.principal + amount > constants.CARD_LIMIT) {
    throw new Error(`${openedBy}: a card balance of ${debt.principal + amount} is over CARD_LIMIT`);
  }
  debt.principal += amount;
  return debt;
}

export function applyDecision(state, decisionId, optionId, decisions = DECISIONS, constants = CONSTANTS) {
  const decision = decisions[decisionId];
  if (!decision) throw new Error(`Unknown decision ${decisionId}`);
  const option = decision.options[optionId];
  if (!option) throw new Error(`${optionId} is not an option of ${decisionId}`);
  if (decision.month !== state.month) {
    throw new Error(`${decisionId} is a month ${decision.month} decision, but the state is at month ${state.month}`);
  }
  if (state.decisions_taken[decisionId]) {
    throw new Error(`${decisionId} was already decided: ${state.decisions_taken[decisionId]}`);
  }
  // Rule 29: an option the state does not offer cannot be chosen
  if (!optionOffered(state, option)) {
    throw new Error(`${optionId} is not offered in this state (rule 29): ${option.requires || `needs one of ${option.modifies_commitment.join(", ")} running`}`);
  }

  const next = structuredClone(state);
  const effects = [];
  const flows = next.pending_flows;
  next.decisions_taken[decisionId] = optionId;
  // Section 10.1: {total_saved} counts from before the decision
  next.saved_before[decisionId] = savedTotal(state);
  const barsBefore = getBars(state, constants);

  // income_event lands in cash before the chosen option applies
  if (decision.income_event) {
    next.cash += decision.income_event;
    flows.cash_in += decision.income_event;
    effects.push({ type: "income_event", decision_id: decisionId, amount: decision.income_event });
  }

  // Both one-off money slots
  const deposit = { termMonths: option.term_months, decisionMonth: next.month };
  const asset = option.asset_type ? { asset_type: option.asset_type } : null;
  for (const [amount, cls] of [[option.money_once, option.liquidity_class], [option.money_once_2, option.liquidity_class_2]]) {
    moveMoney(next, { amount, cls, holdingOwner: optionId, flows, events: effects, source: optionId, deposit, asset });
    // Section 6: a one-off into saving or investment, spread over the months that follow
    if (amount < 0 && SAVING_CLASSES.has(cls)) next.one_off_savings.push({ opened_by: optionId, amount: -amount, month: next.month });
  }

  // Rules 10 and 22: a bought asset, which depreciates by asset_type at step 7
  if (option.asset_acquired_value) {
    if (!BOUGHT_ASSET_TYPES.has(option.asset_type)) {
      throw new Error(`${optionId}: a bought asset needs asset_type phone, two_wheeler, car or other, not ${JSON.stringify(option.asset_type)}`);
    }
    const bought = {
      opened_by: optionId, asset_type: option.asset_type, purchase_price: option.asset_acquired_value,
      month_acquired: next.month, current_value: option.asset_acquired_value,
    };
    next.assets.push(bought);
    effects.push({ type: "asset_acquired", asset: { ...bought } });
  }

  // Rule 15: cover
  if (option.health_cover_delta) {
    next.cover.health_cover += option.health_cover_delta;
    effects.push({ type: "cover_added", cover: "health", amount: option.health_cover_delta });
  }
  if (option.term_cover_delta) {
    next.cover.term_cover += option.term_cover_delta;
    effects.push({ type: "cover_added", cover: "term", amount: option.term_cover_delta });
  }

  // Rule 24: an EMI purchase opens a debt for the asset's price, paid by the stated monthly EMI
  // from the month after (rule 21). It opens no monthly cost.
  if (option.is_emi_purchase === "Y") {
    const payment = -option.money_monthly;
    const debt = {
      type: "emi",
      opened_by: optionId,
      principal: option.asset_acquired_value,
      payment,
      months_remaining: option.commitment_months,
      monthly_rate: impliedMonthlyRate(option.asset_acquired_value, payment, option.commitment_months),
      starts_month: next.month + 1,
    };
    next.debts.push(debt);
    effects.push({ type: "debt_opened", debt: { ...debt } });
  } else if (option.modifies_commitment.length > 0) {
    modifyCommitments(next, option, effects);
  } else {
    if (option.starts_same_month && option.commitment_kind !== "cost") {
      throw new Error(`${optionId}: starts_same_month is only for a monthly cost (rule 21)`);
    }
    const startsMonth = option.starts_same_month === "Y" ? next.month : next.month + 1;
    const common = {
      months: option.commitment_months, openedBy: optionId, startsMonth, termMonths: option.term_months,
      salaryChange: option.is_salary_change === "Y", events: effects,
    };
    openCommitment(next, { amount: option.money_monthly, destination: option.monthly_destination, kind: option.commitment_kind, ...common });
    openCommitment(next, { amount: option.money_monthly_2, destination: option.monthly_destination_2, kind: option.commitment_kind_2, ...common });
  }

  // Section 9: a card for step 4 of the cascade, and a D29 option restarting salary
  if (option.grants_card === "Y") {
    next.has_card = true;
    effects.push({ type: "card_granted" });
  }
  if (option.card_balance) {
    const debt = addToCard(next, option.card_balance, optionId, constants);
    effects.push({ type: "card_balance_added", amount: option.card_balance, principal: debt.principal });
  }
  if (option.card_takes_gap === "Y") {
    next.card_takes_gap = true;
    effects.push({ type: "card_takes_gap" });
  }
  if (option.restarts_salary_after_months) {
    next.employment.restart_month = next.month + option.restarts_salary_after_months;
    effects.push({ type: "salary_restart_scheduled", month: next.employment.restart_month });
  }

  // Life moves at step 10 of this month
  if (option.life) {
    flows.life_effects += option.life;
    effects.push({ type: "life_effect", amount: option.life });
  }

  // The deferred effect
  if (option.deferred_offset_months > 0) {
    const callback = {
      month: decision.month + option.deferred_offset_months,
      decision_id: decisionId,
      opened_by: optionId,
      def_money_once: option.def_money_once || 0,
      def_liquidity_class: option.def_liquidity_class,
      def_money_monthly: option.def_money_monthly || 0,
      def_monthly_destination: option.def_monthly_destination,
      def_commitment_months: option.def_commitment_months,
      commitment_kind: option.commitment_kind,
      salary_change: option.is_salary_change === "Y",
      def_life: option.def_life || 0,
    };
    next.pending_callbacks.push(callback);
    effects.push({ type: "callback_scheduled", month: callback.month, opened_by: optionId });
  }

  effects.push({ type: "bars", before: barsBefore, after: getBars(next, constants) });
  return { state: next, effects };
}
