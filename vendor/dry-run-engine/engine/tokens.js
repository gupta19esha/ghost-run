// Raw values for the section 10.1 tokens, for the UI. The engine formats nothing (ENGINE.md
// rule 2): text/ turns these numbers into the words the player reads. A value the engine
// cannot give is null, and text/ drops the sentence that holds it.
//
// Which moment a text reads (section 10.1, Window):
//   situation_text  the decision's month, before it runs. Holdings as of the last month end.
//                   Holding tokens read the holding opened by the option chosen at depends_on.
//   immediate_text  one month ahead: the end of the month after the decision
//   deferred_text   the end of the callback's month. Call it straight after that month runs.
//                   A callback with no text left never lands (rule 28), so check the events.

import CONSTANTS from "./constants.js";
import DECISIONS from "./decisions.js";
import { advanceMonth } from "./ledger.js";
import { readTokens } from "./token-figures.js";

export { TOKENS } from "./token-figures.js";

const LOOK_AHEAD_MONTHS = 1;

// Situation text shows before the month runs, so costs are this month's, not last month's
function withThisMonthsCosts(state, constants) {
  const view = structuredClone(state);
  const index = view.costs.inflation_index;
  view.costs.living_costs = constants.LIVING_COSTS_START * index;
  view.costs.normal_living = constants.NORMAL_LIVING_START * index;
  view.costs.minimum_living = constants.MINIMUM_LIVING_START * index;
  return view;
}

export function tokenValues(state, { decisionId, optionId = null, field }, decisions = DECISIONS, constants = CONSTANTS) {
  const decision = decisions[decisionId];
  if (!decision) throw new Error(`Unknown decision ${decisionId}`);

  if (field === "situation_text") {
    if (state.month !== decision.month) {
      throw new Error(`${decisionId}'s situation shows at month ${decision.month}, but the state is at month ${state.month}`);
    }
    const owner = decision.depends_on ? state.decisions_taken[decision.depends_on] : null;
    return readTokens(withThisMonthsCosts(state, constants), { owner, savedFrom: null }, constants);
  }

  if (field !== "immediate_text" && field !== "deferred_text") {
    throw new Error(`No tokens in field ${JSON.stringify(field)}`);
  }
  const option = decision.options[optionId];
  if (!option) throw new Error(`${optionId} is not an option of ${decisionId}`);
  if (state.decisions_taken[decisionId] !== optionId) {
    throw new Error(`${optionId}'s text needs a state in which ${optionId} was chosen`);
  }

  let view = state;
  if (field === "immediate_text") {
    if (state.month !== decision.month) {
      throw new Error(`${optionId}'s immediate text shows at month ${decision.month}, but the state is at month ${state.month}`);
    }
    // Through the decision's month, then one month ahead. The market is seeded (section 7).
    for (let i = 0; i <= LOOK_AHEAD_MONTHS; i++) view = advanceMonth(view, constants).state;
  } else {
    const callbackMonth = decision.month + option.deferred_offset_months;
    if (state.month !== callbackMonth + 1) {
      throw new Error(`${optionId}'s deferred text reads the end of month ${callbackMonth}, but the state is at month ${state.month}`);
    }
  }
  return readTokens(view, { owner: optionId, savedFrom: decisionId }, constants);
}
