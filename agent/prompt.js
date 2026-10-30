// The narration prompt: what a model is told about Ghost Run, the token system and one fork, and
// what it is told when an attempt is rejected. Used only by agent/narrate.js, on the server.
//
// The model never writes a figure. It writes tokens, {net_worth_gap} and the rest of
// verify/tokens.js's list, which verify() checks and verify/render.js fills. So the brief shows
// it what each token will print, to write around, and forbids every digit.

import { TOKENS, resolveTokens } from "../verify/tokens.js";
import { FORMATS } from "../verify/render.js";
import { UNITS } from "./rank.js";
import { getDecision } from "../vendor/dry-run-engine/engine/index.js";
import { BAR_LINES } from "../vendor/dry-run-engine/game/screens/bar-lines.js";
import { isUnavailable } from "../vendor/dry-run-engine/engine/token-figures.js";

const BAR_KEYS = ["safety", "freedom", "life"];
const BAR_NAMES = { netWorth: "Net worth", safety: "Safety", freedom: "Freedom", life: "Life" };

// The same money, a different life: net worth ends within a quarter of a unit (agent/rank.js
// UNITS, so about 8,750) while a bar ends a whole unit or more apart. -> the bar that moved most,
// in units, or null
export const SAME_MONEY = UNITS.netWorth / 4;
export const SAME_MONEY_LEAD = "The same money, a different life.";
export function sameMoney(result) {
  const end = result.divergence.at(-1);
  if (!end || Math.abs(end.netWorth) > SAME_MONEY) return null;
  const [bar, units] = BAR_KEYS.map((k) => [k, Math.abs(end[k]) / UNITS[k]]).sort((a, b) => b[1] - a[1])[0];
  return units >= 1 ? bar : null;
}

// What each token is, in words. The brief adds what it prints for this fork
const MEANING = {
  fork_decision: "the id of the decision that was changed (rarely worth saying)",
  fork_month: "the month of the changed decision",
  real_choice: "the option the player chose there, in quotation marks",
  ghost_choice: "the option the ghost took instead, in quotation marks",
  end_month: "the last month both lives reached",
  real_net_worth: "the player's net worth at the end",
  ghost_net_worth: "the ghost's net worth at the end",
  real_safety: "the player's Safety at the end, in points out of a hundred",
  ghost_safety: "the ghost's Safety at the end",
  real_freedom: "the player's Freedom at the end",
  ghost_freedom: "the ghost's Freedom at the end",
  real_life: "the player's Life at the end",
  ghost_life: "the ghost's Life at the end",
  net_worth_gap: "the ghost's net worth against the player's, from the ghost's side, such as \"16,000 less\"",
  safety_gap: "the ghost's Safety against the player's, such as \"4 points higher\" or \"level\"",
  freedom_gap: "the ghost's Freedom against the player's",
  life_gap: "the ghost's Life against the player's",
  identical_months: "how many months the two lives stayed exactly the same, as a word",
  first_divergent_month: "the first month the two lives differed",
  substitution_count: "how many of the player's later choices the ghost could not take, as a word",
  substituted_decision: "the id of the first such decision (rarely worth saying)",
  substitution_month: "the month of that decision",
  withdrawn_choice: "the player's choice there, which the ghost could not take, in quotation marks",
  substitute_choice: "what the ghost took instead, in quotation marks",
};

// The game's own lines, for its voice: result texts from the sheet with no figures in them
const VOICE = [
  "Works fine. Looks bad.",
  "Gone before you see it. You adjust within a week.",
  "He says he understands. The call ends early.",
  "Your life looks identical. Your investment does not.",
  "Two you actually cared about. Two polite apologies.",
  "Your father covers the rest quietly. Nobody discusses it.",
  "Irregular money, long days, no benefits.",
];

export const SYSTEM = `You write the narration for Ghost Run, a game about money in the first two years of a working life in India. The player starts at twenty-two with a first salary and makes one or two choices a month for twenty-four months. They have finished. One of their choices has been changed and the same two years played again by the ghost: the life that took the other option. Everything after that choice was the player's own, wherever the ghost could follow. You tell the player how the two lives came apart.

The game tracks four things. Net worth: ${BAR_LINES.netWorth} Safety: ${BAR_LINES.safety} Freedom: ${BAR_LINES.freedom} Life: ${BAR_LINES.life} Safety, Freedom and Life are bars out of a hundred. In month twenty-two the player is laid off, at the bottom of a market fall.

Voice. Write like the game: short, plain sentences, calm and observant, a little dry. Call the player "you" and the other life "the ghost". These lines are the game's own:
${VOICE.map((line) => `- ${line}`).join("\n")}
No exclamation marks, no questions to the reader, no markdown, no headings, no lists. One paragraph, between ninety and one hundred and eighty words.

Never give advice. Never say or imply that either choice was better, worse, wiser, right, wrong or a mistake, and never say what the player should do, should have done, or could do next time. Describe what happened to each life and leave the judgement to the player.

Figures. You never write a number. Not one digit, anywhere: not in a figure, a month, a label or a quotation. Every figure comes from the simulation through a token: write its name in braces, exactly as listed in the brief, such as {net_worth_gap}, and the game puts the figure there. Write each sentence so it reads naturally with the printed value the brief shows for that token. Use only the tokens the brief lists; never invent one or change its spelling, and never use a token the brief marks unavailable. The option labels contain figures, so never quote or paraphrase an option's wording yourself: use {real_choice}, {ghost_choice}, {withdrawn_choice} and {substitute_choice}. A small count that has no token, such as "two years", is written as a word; never use words to state a figure that has a token.

When the brief says a later choice of the player's was not available to the ghost, you must write one sentence that names it with {withdrawn_choice}, says in that same sentence that it was not available on this path, and says what the ghost took instead with {substitute_choice}.

When the brief says the fork is the same money, a different life, your first sentence is exactly: ${SAME_MONEY_LEAD} Then say what moved instead of the money.

Reply with the narration only.`;

// The brief for one fork: what happened, and every token with what it prints
export function brief(result) {
  const values = resolveTokens(result);
  const end = result.divergence.at(-1);
  const bar = sameMoney(result);
  const lines = [];
  const decision = values.fork_decision ? getDecision(values.fork_decision) : null;
  if (decision) {
    lines.push(`The changed choice was in month ${values.fork_month}. What the player read then, for context only, never to quote: "${decision.situation_text}"`);
  }
  lines.push(`At month ${values.end_month}, the ghost's gaps from the player: net worth ${FORMATS.net_worth_gap(values.net_worth_gap)}, ` +
    BAR_KEYS.map((k) => `${BAR_NAMES[k]} ${FORMATS[`${k}_gap`](values[`${k}_gap`])}`).join(", ") + ".");
  if (bar) {
    lines.push(`This fork is the same money, a different life: the money ends almost level, while ${BAR_NAMES[bar]} ends ${FORMATS[`${bar}_gap`](end[bar])}. Lead on it.`);
  }
  if (result.substitutions.length > 0) {
    lines.push(`A later choice of the player's was not available to the ghost: in month ${values.substitution_month}, ${FORMATS.withdrawn_choice(values.withdrawn_choice)} could not be taken on this path, so the ghost took ${FORMATS.substitute_choice(values.substitute_choice)}. You must say so.`);
  } else {
    lines.push("The ghost could take every later choice the player made.");
  }
  lines.push("", "Tokens, with what each prints for this fork:");
  for (const token of TOKENS) {
    const value = values[token];
    lines.push(isUnavailable(value)
      ? `{${token}}: unavailable for this fork, do not use`
      : `{${token}}: ${MEANING[token]}. Prints: ${FORMATS[token](value)}`);
  }
  return lines.join("\n");
}

// The message that follows a rejected attempt: each failure, said plainly, and a request for the
// whole narration again
export function rejection(failures) {
  const said = [...new Set(failures.map((f) => {
    if (f.rule === "numeral") return "It contains a digit. Write no digits at all: every figure is a token, and small counts are words.";
    if (f.rule === "unknown_token") return f.found ? `{${f.found}} is not a token. Use only the tokens the brief lists.` : "It has a brace that is not part of a token.";
    if (f.rule === "null_token") return `{${f.found}} is unavailable for this fork. Leave it out.`;
    if (f.rule === "substitution_unmentioned") return "It never says that the player's later choice was not available on this path. Add that sentence, with {withdrawn_choice} and {substitute_choice}.";
    if (f.rule === "lead") return `This fork is the same money, a different life, so the first sentence must be exactly: ${SAME_MONEY_LEAD}`;
    return f.detail;
  }))];
  return `The checker rejected that narration:\n${said.map((s) => `- ${s}`).join("\n")}\nWrite the whole narration again with every one of these fixed. Reply with the narration only.`;
}
