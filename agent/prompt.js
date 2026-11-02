// The narration prompt: what a model is told about Ghost Run, the token system and one fork, and
// what it is told when an attempt is rejected. Used only by agent/narrate.js, on the server.
//
// The model never writes a figure. It writes tokens, {net_worth_gap} and the rest of
// verify/tokens.js's list, which verify() checks and verify/render.js fills. So the brief shows
// it what each token will print, to write around, and forbids every digit.

import { TOKENS, resolveTokens } from "../verify/tokens.js";
import { printTokens, ZERO_GAP } from "../verify/render.js";
import { UNITS } from "./rank.js";
import { getDecision } from "../vendor/dry-run-engine/engine/index.js";
import { BAR_LINES } from "../vendor/dry-run-engine/game/screens/bar-lines.js";
import { isUnavailable } from "../vendor/dry-run-engine/engine/token-figures.js";

const BAR_KEYS = ["safety", "freedom", "life"];
const BAR_NAMES = { netWorth: "Net worth", safety: "Safety", freedom: "Freedom", life: "Life" };
const GAP_TOKENS = new Set(["net_worth_gap", "safety_gap", "freedom_gap", "life_gap", "widest_gap", "layoff_net_worth_gap"]);

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
  widest_gap_month: "the month the two lives' net worth was furthest apart",
  widest_gap: "the ghost's net worth against the player's in that month, from the ghost's side",
  ghost_ahead_months: "how many months the ghost's net worth was above the player's, as a word",
  first_bar_apart_month: "the first month Safety, Freedom or Life differed between the two lives",
  first_bar_apart: "which of those it was, by name",
  ghost_lowest_month: "the month the ghost's net worth was at its lowest after the split",
  layoff_month: "the month of the layoff, the same in both lives",
  layoff_real_net_worth: "the player's net worth at the close of that month",
  layoff_ghost_net_worth: "the ghost's net worth at the close of that month",
  layoff_net_worth_gap: "the ghost's net worth against the player's at the close of that month, from the ghost's side",
  crossover_month: "the first month the ghost's net worth moved to the other side of the player's",
  crossover_count: "how many times that happened, as a word",
};

// The no-cause rule in the system prompt stands on SIMULATION-MATHS.md section 14, "The timeline
// shows cost by month, not by choice": a month's change is the sum of every choice, salary, costs,
// returns and shocks, and the engine keeps no attribution of it to a choice.

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

The game tracks four things. Net worth: ${BAR_LINES.netWorth} Safety: ${BAR_LINES.safety} Freedom: ${BAR_LINES.freedom} Life: ${BAR_LINES.life} In month twenty-two the player is laid off, at the bottom of a market fall.

Safety, Freedom and Life are scores from zero to a hundred, measured in points. A point is not a rupee, so never state a score as an amount of money.
- Safety is how long you would survive with zero income, plus your cover. Seventy of its points are runway: the money you could reach against your essential costs, full at six months of runway. Eighteen are health cover, full at half a year's income. Twelve are term cover, which are full when nobody depends on you. At zero you have no reachable money, no health cover and dependants with no term cover. A hundred does not mean safe for good, and points are not months.
- Freedom is how much of your income is already committed: rent, loan payments, premiums, debt minimums and locked saving commitments. Money saved or invested where it can stop any month is not committed. With nothing committed it is a hundred. It falls evenly and reaches zero at seventy per cent of income committed, and it stays zero beyond that. So zero means at least seventy per cent is committed: it does not mean all of it, and at zero there can still be pay left. Never say that all, none, every rupee or nearly all of the pay is claimed.
- Life is the one score not worked out from money alone. Choices move it, and each month it drifts toward a baseline, which runs from forty to seventy. Forty is the floor, for a life with no salary or nothing spent beyond a normal month. Seventy is for spending well above a normal month. It starts at sixty. It reads whether you were living or only getting by, and it says nothing about being happy. The ends, zero and a hundred, are rarely near.

Voice. Write like the game: short, plain, specific sentences, calm and a little dry, with no hedging. Write in the past tense throughout, every sentence. Call the player "you" and the other life "the ghost". These lines are the game's own:
${VOICE.map((line) => `- ${line}`).join("\n")}
No exclamation marks, no questions to the reader, no markdown, no headings, no lists. One paragraph of four to six sentences, counting any required sentence. Short ones. Stop at the last fact: no summing up at the end.

At most one figure per sentence. A figure is an amount: money, scores, gaps and counts. A month that places the sentence in time and a choice token's label do not count.

A gap token prints a complete phrase, its amount and its direction together, as the brief shows. Nothing may follow one in its clause: no word of direction, comparison or measure. End the clause or the sentence there, and write the words before it so that the phrase completes them. Before a money gap, use a verb of having, such as had, held or finished with, and never a form of "to be", stood or sat.

Each choice token prints a label that already says its own amount and description. Introduce it with a plain verb such as chose or took, and never wrap it in a phrase that says what the label says, such as putting money into it, paying it, or naming what it buys.

Give each fact once. Never restate a gap as two scores, or two scores as a gap: for any one measure, use its gap or its two ends, never both. Leave out what you do not need. You need not mention all four measures.

A sentence makes an observation anchored to a token. It does not report the token. Say what a score's level or move means for this life, in your own words. Paraphrasing what a score means is wanted, and it is what brings a sentence alive, so do not hold back from it and do not reuse the wording of the definitions above.

The opening must suit this fork, not follow a pattern. Every narration of every fork is read side by side, so vary how yours begins. Never begin with "For" and a count of months, and never give the sameness a sentence of its own to open on. There are several ways in: the situation that brought the choice, in your own words; the two choices side by side; the person or thing the choice was about; or the month, with the months of sameness folded into a clause. The brief names one that suits this fork. Vary your wording too: never use "spoken for" or "a shade".

Narrate in time order from wherever you begin: the split, then anything that happened after it, then where they ended. How long the two lives were identical is worth saying only if it adds something, and then inside the sentence of the split. Never reach back to something earlier. When the split comes late, or the lives stayed alike after the choice, lead with the split and not the sameness.

Every narration must say where the money ended, with {net_worth_gap} or with both ends at the last month. A gap from the middle of the run does not count.

The brief's tokens include what happened between the split and the end: when the money was furthest apart, how long the ghost was ahead, when a score first parted, the layoff and where each life stood then, and whether the lead changed hands. Those are the middle of this story, and they are what makes it this life and no other. Use the one or two that say the most, each in its place in time, and leave out the rest. They say what happened and when, never why.

You may describe what each side did and what happened, in order. You may never claim that a choice caused an outcome. The engine keeps no attribution of a change to a choice, because a month's change is the sum of every choice made in it, earlier choices still running, salary, living costs, returns and any shock (section fourteen of the maths document), so a claimed cause would be the narration inventing it. The checker rejects because, caused, led to, meant that, which is why, as a result, resulted in and due to. Do not get round it with other words such as so, since, which left, thanks to, cost, drove or made. Set the two side by side and leave the link to the player. The one exception is the required sentence below, whose "so" is the game's own rule.

Never give advice. Never say or imply that either choice was better, worse, wiser, right, wrong or a mistake, and never say what the player should do, should have done, or could do next time. Describe what happened to each life and leave the judgement to the player.

Figures. You never write a number. Not one digit, anywhere: not in a figure, a month, a label or a quotation. Every figure comes from the simulation through a token: write its name in braces, exactly as listed in the brief, such as {net_worth_gap}, and the game puts the figure there. Write each sentence so it reads naturally with the printed value the brief shows for that token. Use only the tokens the brief lists; never invent one or change its spelling, and never use a token the brief marks unavailable. The option labels contain figures, so never quote or paraphrase an option's wording yourself: use {real_choice}, {ghost_choice}, {withdrawn_choice} and {substitute_choice}. Each of those prints a whole label in quotation marks, and the brief shows the exact text. Read it before you write the sentence around it, and never repeat in your own words anything the label already says. A small count that has no token, such as "two years", is written as a word; never use words to state a figure that has a token.

Every sentence must contain at least one token, because a sentence with none could say anything and nothing could check it. Two things are forbidden: asserting an event the brief does not give, and asserting a cause. Paraphrase is neither. Saying what a score's level or move means is paraphrase, and allowed. Saying that a holding, a market or a person did something the brief does not give is inventing an event, and forbidden.

When the brief says a later choice of the player's was not available to the ghost, you must write one sentence that names it with {withdrawn_choice}, says in that same sentence that it was not available on this path, and says what the ghost took instead with {substitute_choice}.

When the brief says the fork is the same money, a different life, your first sentence is exactly: ${SAME_MONEY_LEAD} That sentence alone needs no token. It has already said the money is the same, so never say again, in any words, that the money is close, level or similar. Then say what moved instead of the money.

Reply with the narration only.`;

// A way in for this fork, so that independent calls do not all open alike. Which of the ways is
// taken from the option's id, so it is arbitrary but fixed; a fork whose lives part late, or stay
// alike after the choice, is never given the one that mentions the sameness
const WAYS_IN = [
  "the situation that brought the choice, in your own words",
  "the two choices, side by side",
  "the person or thing the choice was about",
  "the month, with the months of sameness folded into a clause",
];
const LATE_MONTH = 13;
export function wayIn(option, values) {
  const late = values.fork_month >= LATE_MONTH || (values.first_divergent_month ?? 0) > values.fork_month;
  const ways = late ? WAYS_IN.slice(0, 3) : WAYS_IN;
  return { late, way: ways[[...option].reduce((sum, c) => sum + c.charCodeAt(0), 0) % ways.length] };
}

// What Meta's model is told beyond the shared prompt. Kept apart so that the shared prompt, and with
// it the digest of every cached Claude response, stays as it is: Claude's cache is the fallback
export const META_SYSTEM = `${SYSTEM}

These rules come last and win over anything above.

Grammar. Write complete sentences with a subject and a verb. Never join two sentences with a comma. Never drop an article. Always write "the ghost", or "it" once the ghost is plainly the subject, and never bare "ghost".

Months. A month token prints a bare number, which reads as an age or a time on its own. Always write the word "month" directly before it: "in month {fork_month}", "by month {end_month}". This goes for every token whose name ends in month, and for {end_month} and {first_divergent_month}.

How the phrases fit. A score gap prints a phrase such as "points lower": write "the ghost's Freedom ended {freedom_gap}", and never "with" before it. A money gap prints a phrase such as "more": write "the ghost had {net_worth_gap}" or "the ghost finished with {net_worth_gap}".

Whose score. Every claim about a score must name whose score it is, and it must be true. Every gap compares the ghost with the player, from the ghost's side. If a gap says lower, it is the ghost's score that is lower. Never write "your" about a score that moved unless the brief's statement of whose score moved says so. Do this for a paraphrase too: "the ghost's cushion", never just "the cushion". A wrong owner is a false statement and the worst error you can make.

The brief ends with the shape of the narration. Follow it sentence by sentence and use its wording exactly. Add no other sentence, and put nothing between its sentences. Never write a count or a month in words where a token gives it: write the token.`;

// What a score's direction means for the ghost, true of the score's definition whatever the fork:
// for a model that does not hold to a paraphrase of its own
const SCORE_MEANS = {
  safety: { lower: "it could last less long with no pay", higher: "it could last longer with no pay" },
  freedom: { lower: "more of its pay was committed before each month began", higher: "less of its pay was committed before each month began" },
  life: { lower: "it was nearer to only getting by", higher: "it was a little further from only getting by" },
};

// How the sentence of the split goes, in a shape that is true of this fork. Several, so that forks do
// not all open alike; which one is taken from the option's id, so it is arbitrary but fixed
const SPLIT_SHAPES = [
  'After {identical_months} months as one life, you chose {real_choice} in month {fork_month}, and the ghost took {ghost_choice}.',
  'The two lives ran together for {identical_months} months, until month {fork_month}, when you chose {real_choice} and the ghost took {ghost_choice}.',
  'In month {fork_month}, after {identical_months} months that matched, you chose {real_choice} and the ghost took {ghost_choice}.',
  'For {identical_months} months you and the ghost were the same life, and in month {fork_month} you chose {real_choice} while the ghost took {ghost_choice}.',
];
function splitShape(option, values) {
  // The lives stayed alike past the choice itself, so "until the choice" would be false
  if (values.first_divergent_month !== null && values.first_divergent_month > values.fork_month) {
    return 'In month {fork_month} you chose {real_choice} and the ghost took {ghost_choice}, but the two lives stayed the same until month {first_divergent_month}.';
  }
  if (values.identical_months === 0) return 'In month {fork_month}, right at the start, you chose {real_choice} and the ghost took {ghost_choice}.';
  const shape = SPLIT_SHAPES[[...option].reduce((sum, c) => sum + c.charCodeAt(0), 0) % SPLIT_SHAPES.length];
  return values.identical_months === 1 ? shape.replace("{identical_months} months", "{identical_months} month") : shape;
}

// The brief for Meta's model: the shared brief, then whose scores moved in plain words from the
// engine, then the shape of the narration
export function metaBrief(result) {
  const values = resolveTokens(result);
  const printed = printTokens(values);
  const lines = BAR_KEYS.map((k) => {
    const [real, ghost] = [Math.round(values[`real_${k}`]), Math.round(values[`ghost_${k}`])];
    const name = BAR_NAMES[k];
    return real === ghost ? `${name}: level, both at ${real}.` : `${name}: the ghost's ended at ${ghost} and yours at ${real}.`;
  });
  // A sentence for each score that moved, from the score's definition; the two that moved furthest
  const moved = BAR_KEYS
    .map((k) => ({ k, gap: Math.round(values[`ghost_${k}`]) - Math.round(values[`real_${k}`]) }))
    .filter(({ gap }) => gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 2)
    .map(({ k, gap }) => `The ghost's ${BAR_NAMES[k]} ended {${k}_gap}, and ${SCORE_MEANS[k][gap > 0 ? "higher" : "lower"]}.`);
  // What happened between the split and the last month, only from after the split, and only what has
  // a figure to give
  const after = (month) => month !== null && month > values.fork_month && month < values.end_month;
  const between = [
    after(values.layoff_month) && values.layoff_net_worth_gap !== 0 ? "In month {layoff_month}, at the layoff, the ghost had {layoff_net_worth_gap}." : null,
    after(values.widest_gap_month) && values.widest_gap_month !== values.layoff_month ? "The money was furthest apart in month {widest_gap_month}, when the ghost had {widest_gap}." : null,
    after(values.crossover_month) ? "In month {crossover_month}, the lead between the two lives changed hands." : null,
  ].filter(Boolean);
  const option = result.ghost.choices.find((id, i) => id !== result.real.choices[i]);
  const shape = values.fork_month === null ? null : splitShape(option, values);
  const bar = sameMoney(result);
  const parts = [
    bar ? `First sentence, exactly: ${SAME_MONEY_LEAD}` : null,
    shape ? `The sentence of the split, in exactly this shape: ${shape}` : null,
    result.substitutions.length > 0 ? 'Then the required sentence: In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}.' : null,
    between.length > 0 ? `Then exactly one of these, whichever says most about this fork, word for word:\n${between.map((b) => `   - ${b}`).join("\n")}` : null,
    moved.length > 0 ? `Then, word for word, the ${moved.length === 1 ? "sentence" : "sentences"} for the score${moved.length === 1 ? "" : "s"} that moved furthest:\n${moved.map((m) => `   - ${m}`).join("\n")}` : null,
    'Last, exactly: By month {end_month}, the ghost had {net_worth_gap}.',
  ].filter(Boolean);
  return `${brief(result)}\n\nWhose score moved, at the last month:\n${lines.join("\n")}\n\nThe shape of the narration, which wins over the way in above. Write these sentences, in this order, and nothing else:\n${parts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
}

// The brief for one fork: what happened, and every token with what it prints
export function brief(result) {
  const values = resolveTokens(result);
  // The committed cache answers a request only if it is byte for byte the one it was written for,
  // and those briefs say "the same" for a zero gap. Render says "the same as you". Drop this the
  // next time the prompt changes and the cache is regenerated anyway
  const printed = Object.fromEntries(Object.entries(printTokens(values)).map(([k, v]) => [k, v === ZERO_GAP ? "the same" : v]));
  const bar = sameMoney(result);
  const lines = [];
  const decision = values.fork_decision ? getDecision(values.fork_decision) : null;
  if (decision) {
    lines.push(`The changed choice was in month ${values.fork_month}. What the player read then, for context only, never to quote: "${decision.situation_text}"`);
  }
  if (values.fork_month !== null) {
    const { late, way } = wayIn(result.ghost.choices.find((id, i) => id !== result.real.choices[i]), values);
    lines.push(`${late ? "The lives part late or stay alike after the choice, so lead with the split. " : ""}A way in that suits this fork: ${way}. Take another if it plainly suits better, but never the sameness.`);
  }
  const labels = ["real_choice", "ghost_choice", "withdrawn_choice", "substitute_choice"].filter((token) => token in printed);
  if (labels.length > 0) {
    lines.push("The exact text the choice tokens print, each a whole phrase in quotation marks. Fit your sentence around it, and repeat none of its words:",
      ...labels.map((token) => `{${token}} prints ${printed[token]}`), "");
  }
  lines.push(`At month ${values.end_month}, the ghost's gaps from the player: net worth ${printed.net_worth_gap}, ` +
    BAR_KEYS.map((k) => `${BAR_NAMES[k]} ${printed[`${k}_gap`]}`).join(", ") + ".");
  if (bar) {
    lines.push(`This fork is the same money, a different life: the money ends almost level, while ${BAR_NAMES[bar]} ends ${printed[`${bar}_gap`]}. Lead on it.`);
  }
  if (result.substitutions.length > 0) {
    lines.push(`A later choice of the player's was not available to the ghost: in month ${values.substitution_month}, ${printed.withdrawn_choice} could not be taken on this path, so the ghost took ${printed.substitute_choice}. You must say so.`);
  } else {
    lines.push("The ghost could take every later choice the player made.");
  }
  lines.push("", "Tokens, with what each prints for this fork:");
  for (const token of TOKENS) {
    const value = values[token];
    lines.push(isUnavailable(value)
      ? `{${token}}: unavailable for this fork, do not use`
      : `{${token}}: ${MEANING[token]}. Prints${GAP_TOKENS.has(token) ? " this complete phrase, and nothing may follow it" : ""}: ${printed[token]}`);
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
    if (f.rule === "sentence_without_token") return `This sentence has no token in it, so nothing in it can be checked: "${f.found}" Remove it, or say only what a token in that sentence carries.`;
    if (f.rule === "causal_claim") return `"${f.found}" claims a cause, and the game keeps no record of what caused what. Set the events side by side, in order, with no causal link.`;
    if (f.rule === "lead") return `This fork is the same money, a different life, so the first sentence must be exactly: ${SAME_MONEY_LEAD}`;
    return f.detail;
  }))];
  return `The checker rejected that narration:\n${said.map((s) => `- ${s}`).join("\n")}\nWrite the whole narration again with every one of these fixed. Reply with the narration only.`;
}
