// The landing page's logic, with no DOM: one month of the demo life (web/demo/save.json), as the
// game shows it, and what each of that month's options would have done to it. Runs unchanged in
// Node, so web/test/landing-model.test.js checks it.
//
// Every figure comes from the engine, through runner/: the month as the demo life played it, and
// a fork of that life for each option the player can try on the page. Nothing here writes a
// number or formats one; text/render.js and verify/render.js do.

import { play, replay } from "../runner/replay.js";
import { fork } from "../runner/fork.js";
import { forkView } from "./ghost-model.js";
import { applyDecision, getDecision, salaryThisMonth, safetyInDanger, tokenValues } from "../vendor/dry-run-engine/engine/index.js";
import { renderText, formatMoney } from "../vendor/dry-run-engine/text/render.js";

export const BAR_KEYS = ["safety", "freedom", "life"];
export const BAR_NAMES = { safety: "Safety", freedom: "Freedom", life: "Life" };

// The month the landing shows: month 7, a single decision, your sister's coaching class. It has
// no right answer, every option moves something, and nothing in it is about markets
export const SHOWN_DECISION = "D12";

// The demo life up to a decision: the month card's lines, the decision as the game words it, and
// each option's result line, rendered against the state the option would leave.
// -> { index, month, age, salary, situation, options: [{ id, label, line }], demoChoice }
export function monthPreview(save, decisionId = SHOWN_DECISION) {
  let found = null;
  play(save.seed, (decision, state, index) => {
    if (decision.decision_id !== decisionId) return index < save.choices.length ? save.choices[index] : null;
    const salary = salaryThisMonth(state);
    found = {
      index,
      month: state.month,
      age: state.age,
      salary: salary > 0 ? formatMoney(salary) : null,
      situation: renderText(decision.situation_text, tokenValues(state, { decisionId, field: "situation_text" })),
      options: Object.values(decision.options).map((option) => {
        const after = applyDecision(state, decisionId, option.option_id).state;
        const tokens = tokenValues(after, { decisionId, optionId: option.option_id, field: "immediate_text" });
        return { id: option.option_id, label: option.option_label, line: renderText(option.immediate_text, tokens) };
      }),
      demoChoice: save.choices[index],
    };
    return null;
  });
  if (!found) throw new Error(`${decisionId} is not in the demo life`);
  return found;
}

// The month close for one option: the bars as the month found them and as it left them, from a
// fork of the demo life at that choice. The demo's own option forks to an identical run.
// danger: Safety is below the engine's danger line once the month has run, which the game shows
// in vermilion whatever the bar did (UI.md rule 4's one exception).
// -> { month, before: {netWorth, safety, freedom, life}, after: {...}, danger }
export function monthOutcome(save, index, option) {
  const result = fork(save, index, option);
  const month = getDecision(option.split("-")[0]).month;
  const bars = result.ghost.bars;
  const after = bars.find((b) => b.month === month);
  const before = bars.find((b) => b.month === month - 1);
  if (!after || !before) throw new Error(`The fork has no month ${month} close`);
  // The run to the end of that month: every earlier choice, then this one
  const { state } = replay(save.seed, [...save.choices.slice(0, index), option]);
  return { month, before, after, danger: safetyInDanger(state) };
}

// The ghost the landing draws. Month 17, your father's business loan: the demo life said it could
// not manage; the ghost takes over the full EMI. Picked because money and the bars disagree on it
// (the ghost ends poorer and less free, with more Life), so the page shows a trade-off rather
// than a right answer. The same view the ghost screen draws (forkView), with the situation as
// the player read it.
export const SHOWN_FORK = { decisionId: "D23", option: "D23-A" };
export function landingFork(save, { decisionId, option } = SHOWN_FORK) {
  let situation = null;
  const { choices } = play(save.seed, (decision, state, i) => {
    if (decision.decision_id !== decisionId) return save.choices[i] ?? null;
    situation = renderText(decision.situation_text, tokenValues(state, { decisionId, field: "situation_text" }));
    return null;
  });
  if (!situation) throw new Error(`${decisionId} is not in the demo life`);
  return { ...forkView(save, choices.length, option), situation };
}
