// The ghost screen's logic, with no DOM: what web/ghost.js draws. Runs unchanged in Node, so
// web/test/ghost-model.test.js checks it against the same runner and verifier the page uses.
//
// Every figure here comes from the engine through runner/: replay() for the real run, fork()
// for the ghost. The narration comes from api/narrate.js; every attempt it returns is checked
// again here, by verify() against the fork it narrates, before it is shown.

import { play } from "../runner/replay.js";
import { fork } from "../runner/fork.js";
import { order, SCORE } from "../agent/rank.js";
import { judge } from "../verify/attempts.js";
import { leadCheck } from "../agent/checks.js";
import { isPlainNarration } from "../agent/plain.js";
import { sameMoney, SAME_MONEY_LEAD } from "../agent/prompt.js";
import { renderNarration, printTokens, exactMoneyGap } from "../verify/render.js";
import { resolveTokens } from "../verify/tokens.js";
import { createState, getBars, getDecision, monthSummary, tokenValues } from "../vendor/dry-run-engine/engine/index.js";
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

// "You wouldn't guess": agent/rank.js's ruled score
export function surpriseList(forks, n = 5) {
  return bestPerChoice(order(forks, SCORE).filter((f) => f.score > 0)).slice(0, n);
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

export { sameMoney, SAME_MONEY_LEAD };

// The narrator's attempts for a fork, as api/narrate.js returned them, each checked again here:
// verify() and the same-money lead, against the fork the screen shows.
// served: [{ number, narration, ok }]. -> { attempts, accepted, rejected, rendered, agrees, plain }
// agrees is false if this check disagrees with the server's on any attempt. plain is true when no
// model wrote it: agent/plain.js built it from the fork's figures
export function checkAttempts(result, served) {
  const check = leadCheck(result);
  const attempts = served.map((a) => judge(a.narration, result, a.number, check));
  const accepted = attempts.find((a) => a.ok) ?? null;
  return {
    attempts,
    accepted,
    rejected: attempts.filter((a) => !a.ok),
    rendered: accepted ? renderNarration(accepted.narration, accepted) : null,
    agrees: attempts.every((a, i) => a.ok === served[i].ok),
    plain: attempts.length > 0 && attempts.every((a) => isPlainNarration(a.narration)),
  };
}

// The figures a draft typed in itself: whole numbers as written, "2,400" not "2" and "400"
const TYPED = /\p{Nd}[\p{Nd},.]*\p{Nd}|\p{Nd}/gu;
const typedFigures = (narration) => [...new Set(narration.match(TYPED) ?? [])];

// Why an attempt was rejected, in the player's words: one reason per thing wrong. verify()
// counts each run of digits as a numeral, so a typed "2,400" is two failures and one reason
export function reasons(attempt) {
  const out = [];
  const numerals = attempt.failures.filter((f) => f.rule === "numeral");
  if (numerals.length) {
    const typed = typedFigures(attempt.narration);
    out.push({ rule: "numeral", count: numerals.length,
      text: `Typed ${typed.map((t) => `“${t}”`).join(" and ")} into the text itself. Every figure has to come from the simulation, so a typed number is refused.` });
  }
  for (const f of attempt.failures.filter((f) => f.rule !== "numeral")) out.push({ rule: f.rule, count: 1, text: failureWords(f) });
  return out;
}

// One failure, in the player's words
export function failureWords(failure) {
  if (failure.rule === "numeral") return `Typed “${failure.found}” into the text itself. Every figure has to come from the simulation, so a typed number is refused.`;
  if (failure.rule === "unknown_token") {
    return failure.found ? `Asked for {${failure.found}}, a figure the simulation does not have.` : "Left a brace that opens or closes no figure.";
  }
  if (failure.rule === "null_token") return `Used {${failure.found}}, a figure this fork has no value for.`;
  if (failure.rule === "substitution_unmentioned") {
    return `Never said that ${failure.found.map((o) => `“${label(o)}”`).join(" and ")} was not on the table on the ghost's path.`;
  }
  if (failure.rule === "sentence_without_token") return `Wrote “${failure.found}”, a sentence with no figure from the simulation in it, so nothing could check it.`;
  if (failure.rule === "causal_claim") return `Wrote “${failure.found}”, claiming a cause. The simulation keeps no record of which choice caused a change.`;
  if (failure.rule === "lead") return `Did not open with “${SAME_MONEY_LEAD}”, though the money ends almost level.`;
  return failure.detail;
}

// A rejected draft, cut into pieces with what verify() caught marked: [{ text, mark }]
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function markedDraft(narration, failures) {
  const caught = [...new Set([
    ...(failures.some((f) => f.rule === "numeral") ? typedFigures(narration) : []),
    ...failures.filter((f) => f.rule === "unknown_token" && f.found).map((f) => `{${f.found}}`),
    ...failures.filter((f) => f.rule === "sentence_without_token" || f.rule === "causal_claim").map((f) => f.found),
  ])].sort((a, b) => b.length - a.length);
  if (caught.length === 0) return [{ text: narration, mark: false }];
  const pattern = new RegExp(`(${caught.map(escape).join("|")})`, "g");
  return narration.split(pattern).filter(Boolean).map((text) => ({ text, mark: caught.includes(text) }));
}

// The ghost's road, for the split step (web/ui.js road): a point for each month from the fork to
// the last, its offset sideways from your road, 0 on it. It leaves yours at the fork and is
// alongside within BRANCH_MONTHS. It ends up on the side it finished the money on, further the
// further apart the money ended, on a root scale so that a small gap is still a different place;
// level money goes to the far side at the least distance. A fork in the last month leaves from the
// month before, or there would be no road to draw.
const BRANCH_MONTHS = 3;
const ROAD_NEAR = 0.45;
const ROAD_GAP = 230000;
export function ghostRoad(months, split, gap) {
  const last = months.at(-1);
  const from = split < last ? split : months.at(-2);
  const side = gap < 0 ? -1 : 1;
  const far = ROAD_NEAR + (1 - ROAD_NEAR) * Math.min(1, Math.sqrt(Math.abs(gap) / ROAD_GAP));
  const steps = Math.min(BRANCH_MONTHS, last - from);
  return months.filter((m) => m >= from).map((month) => {
    const t = Math.min(1, (month - from) / steps);
    return { month, offset: t === 0 ? 0 : side * far * t * t * (3 - 2 * t) };
  });
}

// One sentence per substitution, in plain words, for the notice on the road
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

// A fork, ready to draw: both runs, where they split, the month 24 comparison. Its narration
// arrives separately (checkAttempts)
export function forkView(save, monthIndex, option) {
  const result = fork(save, monthIndex, option);
  const printed = printTokens(resolveTokens(result));
  const decisionId = option.split("-")[0];
  const month = getDecision(decisionId).month;
  const end = result.divergence.at(-1);
  const realEnd = result.real.bars.find((b) => b.month === end.month);
  const ghostEnd = result.ghost.bars.find((b) => b.month === end.month);
  return {
    result,
    monthIndex,
    decisionId,
    month,
    real: { option: save.choices[monthIndex], label: label(save.choices[monthIndex]) },
    ghost: { option, label: label(option) },
    notices: substitutionNotices(result),
    compare: ["netWorth", ...BAR_KEYS].map((key) => ({
      key,
      name: BAR_NAMES[key],
      real: realEnd[key],
      ghost: ghostEnd[key],
      gap: key === "netWorth" ? exactMoneyGap(realEnd[key], ghostEnd[key]) : printed[`${key}_gap`],
    })),
    endMonth: end.month,
    road: {
      months: result.real.bars.map((b) => b.month),
      points: ghostRoad(result.real.bars.map((b) => b.month), month, ghostEnd.netWorth - realEnd.netWorth),
      split: month,
      marks: result.substitutions.map((s) => getDecision(s.decisionId).month),
      // The layoff, with the sheet's words for its month
      layoff: printed.layoff_month ? { month: Number(printed.layoff_month), label: monthSummary(Number(printed.layoff_month)) } : null,
    },
    sameMoney: sameMoney(result),
  };
}
