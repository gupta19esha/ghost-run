// The ghost screen's logic, with no DOM: what web/ghost.js draws. Runs unchanged in Node, so
// web/test/ghost-model.test.js checks it against the same runner and verifier the page uses.
//
// Every figure here comes from the engine through runner/: replay() for the real run, fork()
// for the ghost. verify() checks the narration against the fork it narrates. No model is called.

import { play } from "../runner/replay.js";
import { fork } from "../runner/fork.js";
import { order, SCORE, UNITS } from "../agent/rank.js";
import { attempt } from "../verify/attempts.js";
import { resolveTokens } from "../verify/tokens.js";
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

// The same money, a different life: net worth ends within a quarter of a unit (agent/rank.js
// UNITS, so about 8,750) while a bar ends a whole unit or more apart. The bar that moved most, in
// units, is the one the narration turns on. -> that bar, or null
export const SAME_MONEY = UNITS.netWorth / 4;
export function sameMoney(result) {
  const end = result.divergence.at(-1);
  if (!end || Math.abs(end.netWorth) > SAME_MONEY) return null;
  const [bar, units] = BAR_KEYS.map((k) => [k, Math.abs(end[k]) / UNITS[k]]).sort((a, b) => b[1] - a[1])[0];
  return units >= 1 ? bar : null;
}

const SUBSTITUTION_SENTENCE = "In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}.";
const DISCLAIMER = "This is placeholder narration, written before any model is connected.";

// The placeholder narration: tokens only, so verify() can check every figure in it. A fork where
// money barely moves leads on that, because it is the outcome the feature exists to show; any
// other leads on the choice. A substitution sentence is there when the ghost had one, as a real
// narration must have
export function placeholderNarration(result) {
  const bar = sameMoney(result);
  const parted = resolveTokens(result).identical_months === 0
    ? "The two lives parted at once, in month {first_divergent_month}."
    : "The two lives were the same for {identical_months} months and parted in month {first_divergent_month}.";
  const others = BAR_KEYS.filter((k) => k !== bar);
  const sentences = bar
    ? [
      "The same money, a different life.",
      `By month {end_month} the two lives are worth almost the same, the ghost has {net_worth_gap}, but its ${BAR_NAMES[bar]} ends {${bar}_gap}.`,
      "It turns on month {fork_month}, when the ghost took {ghost_choice} instead of {real_choice}.",
      `Its ${BAR_NAMES[others[0]]} ends {${others[0]}_gap}, and its ${BAR_NAMES[others[1]]} {${others[1]}_gap}.`,
    ]
    : [
      "In month {fork_month} you chose {real_choice}, and the ghost took {ghost_choice}.",
      parted,
      "By month {end_month} the ghost has {net_worth_gap}: {ghost_net_worth} against your {real_net_worth}.",
      "Its Safety ends {safety_gap}, its Freedom {freedom_gap}, and its Life {life_gap}.",
    ];
  if (result.substitutions.length > 0) sentences.splice(bar ? 3 : 1, 0, SUBSTITUTION_SENTENCE);
  return [...sentences, DISCLAIMER].join(" ");
}

// Rehearsal drafts: deliberately flawed narrations, the mistakes a model will make, offered before
// the good one so the checking has something to refuse. Each breaks one verify() rule:
//   inline        a figure typed into the text instead of its token
//   invent        a figure the simulation does not have
//   substitution  the choice that was not on the table, left out
export const FLAWS = {
  inline: (narration, values) => {
    const token = ["net_worth_gap", "ghost_net_worth", "real_net_worth"].find((t) => narration.includes(`{${t}}`));
    return narration.replace(`{${token}}`, FORMATS[token](values[token]));
  },
  invent: (narration) => narration.replace(DISCLAIMER, `That leaves the ghost {retirement_years_earlier} years nearer to retiring. ${DISCLAIMER}`),
  substitution: (narration) => narration.replace(`${SUBSTITUTION_SENTENCE} `, ""),
};

// Which flaws a fork rehearses: none, one or two, the same every time for the same fork. A fork
// with a substitution always rehearses leaving it out, the mistake that matters most
export function rehearsal(result, monthIndex, option) {
  const n = [...`${monthIndex}:${option}`].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3;
  const kinds = n % 2 ? ["invent", "inline"] : ["inline", "invent"];
  return result.substitutions.length > 0 ? ["substitution", ...kinds].slice(0, Math.max(1, n)) : kinds.slice(0, n);
}

// The narrator for now: the rehearsal drafts, then the good placeholder. Lazy, as a model's
// attempts will be: nothing after the accepted one is written
export function* placeholderAttempts(result, flaws) {
  const good = placeholderNarration(result);
  const values = resolveTokens(result);
  for (const flaw of flaws) yield { narration: FLAWS[flaw](good, values), flaw };
  yield { narration: good, flaw: null };
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
  return failure.detail;
}

// A rejected draft, cut into pieces with what verify() caught marked: [{ text, mark }]
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function markedDraft(narration, failures) {
  const caught = [...new Set([
    ...(failures.some((f) => f.rule === "numeral") ? typedFigures(narration) : []),
    ...failures.filter((f) => f.rule === "unknown_token" && f.found).map((f) => `{${f.found}}`),
  ])].sort((a, b) => b.length - a.length);
  if (caught.length === 0) return [{ text: narration, mark: false }];
  const pattern = new RegExp(`(${caught.map(escape).join("|")})`, "g");
  return narration.split(pattern).filter(Boolean).map((text) => ({ text, mark: caught.includes(text) }));
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
  const month = getDecision(decisionId).month;
  // Every attempt, checked and kept; the first that passes is shown
  const drafts = [...placeholderAttempts(result, rehearsal(result, monthIndex, option))];
  const log = attempt(drafts.map((d) => d.narration), result);
  log.attempts.forEach((a, i) => { a.flaw = drafts[i].flaw; });
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
      gap: key === "netWorth" ? FORMATS.net_worth_gap(end[key]) : FORMATS[`${key}_gap`](end[key]),
    })),
    endMonth: end.month,
    sameMoney: sameMoney(result),
    attempts: log.attempts,
    accepted: log.accepted,
    rejected: log.rejected,
    rendered: log.accepted ? renderNarration(log.accepted.narration, log.accepted) : null,
  };
}
