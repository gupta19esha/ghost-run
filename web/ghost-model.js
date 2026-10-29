// The ghost screen's logic, with no DOM: what web/ghost.js draws. Runs unchanged in Node, so
// web/test/ghost-model.test.js checks it against the same runner and verifier the page uses.
//
// Every figure here comes from the engine through runner/: replay() for the real run, fork()
// for the ghost. verify() checks the narration against the fork it narrates. No model is called.

import { play } from "../runner/replay.js";
import { fork } from "../runner/fork.js";
import { order, SCORES } from "../agent/rank.js";
import { verify } from "../verify/verify.js";
import { renderNarration, FORMATS } from "../verify/render.js";
import { createState, getBars, getDecision, tokenValues } from "../vendor/dry-run-engine/engine/index.js";
import { renderText } from "../vendor/dry-run-engine/text/render.js";

export const BAR_KEYS = ["safety", "freedom", "life"];
export const BAR_NAMES = { netWorth: "Net worth", safety: "Safety", freedom: "Freedom", life: "Life" };

const label = (optionId) => getDecision(optionId.split("-")[0]).options[optionId].option_label;
export const optionLabel = label;

// The finished run: bars per month, and every choice grouped by month with what else was offered
// there and the situation as the player read it.
// -> { bars, end, startNetWorth, months: [{ month, summary, choices: [{ index, decisionId, month, situation, chosen, alternatives }] }] }
export function readRun(save) {
  const choices = [];
  const run = play(save.seed, (decision, state, index) => {
    if (index >= save.choices.length) return null;
    const id = decision.decision_id;
    choices.push({
      index,
      decisionId: id,
      month: state.month,
      situation: renderText(decision.situation_text, tokenValues(state, { decisionId: id, field: "situation_text" })),
      chosen: { option: save.choices[index], label: label(save.choices[index]) },
      // What the run offered there (rule 29): the alternatives a fork can take
      alternatives: Object.keys(decision.options).filter((o) => o !== save.choices[index]).map((option) => ({ option, label: label(option) })),
    });
    return save.choices[index];
  });
  if (run.choices.length !== save.choices.length) throw new Error("The demo save does not replay");
  const months = run.bars.map(({ month }) => ({
    month,
    summary: choices.filter((c) => c.month === month).map((c) => getDecision(c.decisionId).month_summary).find(Boolean) ?? null,
    choices: choices.filter((c) => c.month === month),
  }));
  return { bars: run.bars, end: run.bars.at(-1), startNetWorth: getBars(createState(save.seed)).netWorth, months };
}

// The two lists, from rank summaries (web/rank-worker.js): the best alternative for each choice,
// then the top few. A choice with several alternatives would otherwise fill two places.
const bestPerChoice = (ranked) => ranked.filter((f, i) => ranked.findIndex((g) => g.monthIndex === f.monthIndex) === i);

// "Cost you the most": the alternatives that would have left the player richest at month 24
export function costList(forks, n = 5) {
  const ranked = order(forks, ({ end }) => ({ score: end.netWorth, reason: "cost" })).filter((f) => f.score > 0);
  return bestPerChoice(ranked).slice(0, n);
}

// "You wouldn't guess": agent/rank.js's surprise score, the one measured for this
export function surpriseList(forks, n = 5) {
  return bestPerChoice(order(forks, SCORES.surprise).filter((f) => f.score > 0)).slice(0, n);
}

// What a surprise reason means, in the player's words
export function surpriseWords(reason, end) {
  const [kind, key] = reason.split(":");
  const bar = BAR_NAMES[key];
  const way = (v) => (v > 0 ? "higher" : "lower");
  if (kind === "quiet-money") return `${bar} ends ${way(end[key])}, though the money barely moves`;
  if (kind === "shock") return `${bar} only moves when the layoff comes`;
  if (kind === "trade-off") return end.netWorth > 0 ? `Richer, but ${bar} ends lower` : `Poorer, but ${bar} ends higher`;
  if (kind === "reversal") return `${bar} is behind for months, then ends ahead`;
  return "";
}

// The placeholder narration: tokens only, so verify() can check every figure in it. A
// substitution sentence is included when the ghost had one, as a real narration must
export function placeholderNarration(result) {
  const sentences = [
    "This is placeholder narration, written before any model is connected.",
    "In month {fork_month} you chose {real_choice}, and the ghost took {ghost_choice}.",
    "The two lives were the same for {identical_months} months and parted in month {first_divergent_month}.",
    "By month {end_month} the ghost has {net_worth_gap}: {ghost_net_worth} against your {real_net_worth}.",
    "Its Safety ends {safety_gap}, its Freedom {freedom_gap}, and its Life {life_gap}.",
  ];
  if (result.substitutions.length > 0) {
    sentences.splice(2, 0, "In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}.");
  }
  return sentences.join(" ");
}

// One sentence per substitution, in plain words, for the notice on the chart
export function substitutionNotices(result) {
  return result.substitutions.map((s) => {
    const month = getDecision(s.decisionId).month;
    return {
      month,
      text: s.chosen
        ? `Month ${month}: the choice you made, “${label(s.withdrawn)}”, was not on the table on this path. The ghost took “${label(s.chosen)}” instead.`
        : `Month ${month}: the choice you made, “${label(s.withdrawn)}”, was not on the table on this path, so the ghost stops there.`,
    };
  });
}

// A fork, ready to draw: both runs, where they split, the month 24 comparison and the
// placeholder checked by verify()
export function forkView(save, monthIndex, option) {
  const result = fork(save, monthIndex, option);
  const decisionId = option.split("-")[0];
  const narration = placeholderNarration(result);
  const verification = verify(narration, result);
  const end = result.divergence.at(-1);
  const realEnd = result.real.bars.find((b) => b.month === end.month);
  const ghostEnd = result.ghost.bars.find((b) => b.month === end.month);
  return {
    result,
    monthIndex,
    decisionId,
    month: getDecision(decisionId).month,
    real: { option: save.choices[monthIndex], label: label(save.choices[monthIndex]) },
    ghost: { option, label: label(option) },
    notices: substitutionNotices(result),
    compare: ["netWorth", ...BAR_KEYS].map((key) => ({
      key,
      name: BAR_NAMES[key],
      real: realEnd[key],
      ghost: ghostEnd[key],
      gap: key === "netWorth" ? FORMATS.net_worth_gap(end[key]) : FORMATS[`${key}_gap`](end[key]),
    })),
    endMonth: end.month,
    narration,
    verification,
    rendered: verification.ok ? renderNarration(narration, verification) : null,
  };
}
