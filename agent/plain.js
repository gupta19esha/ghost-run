// A narration built from a fork's tokens, with no model and no network: what the stub provider
// answers, and what a player's own run gets in the browser, since the narrator takes only the demo
// life. It says that it is a stand-in, in its own last sentence.

import { sameMoney, SAME_MONEY_LEAD } from "./prompt.js";
import { resolveTokens } from "../verify/tokens.js";

export function plainNarration(forkResult) {
  const bar = sameMoney(forkResult);
  const values = resolveTokens(forkResult);
  const names = { safety: "Safety", freedom: "Freedom", life: "Life" };
  const others = ["safety", "freedom", "life"].filter((k) => k !== bar);
  const sentences = bar
    ? [
      SAME_MONEY_LEAD,
      `By month {end_month} the two lives are worth almost the same, the ghost has {net_worth_gap}, but its ${names[bar]} ends {${bar}_gap}.`,
      "It turns on month {fork_month}, when the ghost took {ghost_choice} instead of {real_choice}.",
      `Its ${names[others[0]]} ends {${others[0]}_gap}, and its ${names[others[1]]} {${others[1]}_gap}.`,
    ]
    : [
      "In month {fork_month} you chose {real_choice}, and the ghost took {ghost_choice}.",
      values.identical_months === 0
        ? "The two lives parted at once, in month {first_divergent_month}."
        : "The two lives were the same for {identical_months} months and parted in month {first_divergent_month}.",
      "By month {end_month} the ghost has {net_worth_gap}: {ghost_net_worth} against your {real_net_worth}.",
      "Its Safety ends {safety_gap}, its Freedom {freedom_gap}, and its Life {life_gap}.",
    ];
  if (forkResult.substitutions.length > 0) {
    sentences.splice(bar ? 3 : 1, 0, "In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}.");
  }
  sentences.push("This account of month {fork_month} is a stand-in, written without a model.");
  return sentences.join(" ");
}
