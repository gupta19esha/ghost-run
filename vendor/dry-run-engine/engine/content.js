// The decisions a player faces, for the UI. UI.md: the UI never reaches past the engine's
// interfaces, so the sheet's content is read through here, not from decisions.js directly.
// Every call returns a copy, so nothing the UI does can change the content.

import DECISIONS from "./decisions.js";

// Rule 29 (maths doc section 10): an option that cannot apply is not offered. A precondition
// is structural, the thing the option acts on exists; affordability never is one.
//
// The commitment behind the `index` precondition: D16-A's monthly investment, which D20-A may
// have redirected to small caps and which stays D16-A's either way
const INDEX_COMMITMENT = "D16-A";
// A saving commitment one of these options opened is running (rule 17 acts on those only)
const running = (state, openedBy) => state.commitments.some((c) => c.kind === "saving" && openedBy.includes(c.opened_by));
const REQUIRES = {
  index: (state) => running(state, [INDEX_COMMITMENT]),
  no_index: (state) => !running(state, [INDEX_COMMITMENT]),
};

// Whether the state meets the option's precondition: an option that modifies commitments needs
// one of them running, and an option with `requires` needs it to hold
export function optionOffered(state, option) {
  const targets = option.modifies_commitment || [];
  if (targets.length > 0 && !running(state, targets)) return false;
  if (option.requires) {
    const holds = REQUIRES[option.requires];
    if (!holds) throw new Error(`${option.option_id}: unknown requires ${JSON.stringify(option.requires)}`);
    if (!holds(state)) return false;
  }
  return true;
}

// The option ids the state offers for a decision, in sheet order
export function optionsFor(state, decision) {
  return Object.values(decision.options).filter((o) => optionOffered(state, o)).map((o) => o.option_id);
}

// The decisions still to be made this month, in sheet order, each with only the options this
// state offers (rule 29)
export function decisionsForMonth(state, decisions = DECISIONS) {
  return Object.values(decisions)
    .filter((d) => d.month === state.month && !state.decisions_taken[d.decision_id])
    .sort((a, b) => a.decision_id.localeCompare(b.decision_id))
    .map((d) => {
      const copy = structuredClone(d);
      copy.options = Object.fromEntries(Object.entries(copy.options).filter(([, o]) => optionOffered(state, o)));
      return copy;
    });
}

// The concept card a month unlocks, from the one decision that month that carries it
// (sheet v24), or null. It unlocks because the month happened, so it does not depend on
// which option was chosen.
export function conceptForMonth(month, decisions = DECISIONS) {
  const carrier = Object.values(decisions).find((d) => d.month === month && d.concept_title);
  return carrier ? { title: carrier.concept_title, body: carrier.concept_body, decision_id: carrier.decision_id } : null;
}

// What happened in a month, in five words or fewer, from the sheet's month_summary on the
// month's first decision (v25), or null. The chapter report shows it under a month it names.
export function monthSummary(month, decisions = DECISIONS) {
  const first = Object.values(decisions)
    .filter((d) => d.month === month)
    .sort((a, b) => a.decision_id.localeCompare(b.decision_id))[0];
  return first?.month_summary ?? null;
}

export function getDecision(decisionId, decisions = DECISIONS) {
  const decision = decisions[decisionId];
  if (!decision) throw new Error(`Unknown decision ${decisionId}`);
  return structuredClone(decision);
}
