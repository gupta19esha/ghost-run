// Checks a narration of a fork before anyone reads it. Every figure in the text must come from
// the simulation, so the narration carries no numbers of its own: only tokens, which
// verify/tokens.js resolves from the fork result and verify/render.js fills in.
//
// verify(narration, forkResult) -> { ok, figures, failures }
//   figures   each token the narration uses, once, in order: { token, value, text }, text being
//             what it prints. The UI's "N figures checked against the simulation" counts these.
//   failures  { rule, detail, found }, in rule order. ok is true when there are none. found is
//             what the rule caught: the numeral, the token name, or the withdrawn option ids.
//
// Rules, in order:
//   numeral                   any digit in the narration. Numbers appear only as tokens; small
//                             numbers the prose needs are spelled as words
//   unknown_token             a {name} not in TOKENS, or a brace that opens or closes no token
//   null_token                a token this fork cannot give a value for
//   substitution_unmentioned  the ghost could not take a later real choice, and no sentence says
//                             so: a sentence that names the substitution with one of
//                             SUBSTITUTION_TOKENS and says the choice was unavailable
//   sentence_without_token    a sentence with no token in it, which could state anything. The one
//                             exception is a same-money fork's first sentence when it is exactly
//                             SAME_MONEY_LEAD, which is written here, not by the narrator
//   causal_claim              a sentence that asserts a cause. The engine keeps no attribution of
//                             a month's change to a choice (SIMULATION-MATHS.md section 14), so
//                             the claim would be false, however the rest of it reads
//
// Every rule runs, so one pass reports everything wrong with a narration.

import { TOKENS, SUBSTITUTION_TOKENS, resolveTokens } from "./tokens.js";
import { printTokens } from "./render.js";
import { sameMoney, SAME_MONEY_LEAD } from "../agent/prompt.js";
import { splitSentences, isUnavailable } from "../vendor/dry-run-engine/engine/token-figures.js";

// Any decimal digit in any script, so Devanagari numerals do not slip through
const NUMERAL = /\p{Nd}+/gu;
// Anything in braces is meant as a token, so {netWorth} or {real_nw} is caught, not passed as prose
const BRACED = /\{([^{}]*)\}/g;
const STRAY_BRACE = /[{}]/;
// Checked on the narration's own words, before any label is filled in
const CAUSAL = /\b(because|caused|led to|meant that|which is why|as a result|resulted in|due to)\b/gi;

// How a sentence says a choice was not open on the ghost path
const UNAVAILABLE = /\b(unavailable|not available|no longer available|not offered|no longer offered|wasn't offered|was not offered|not on offer|not open|no longer open|couldn't take|could not take|couldn't make|could not make|couldn't choose|could not choose)\b/i;

export function verify(narration, forkResult) {
  const values = resolveTokens(forkResult);
  const known = new Set(TOKENS);
  const failures = [];

  for (const [numeral] of narration.matchAll(NUMERAL)) {
    failures.push({ rule: "numeral", detail: `Bare numeral "${numeral}": write a token, or spell a small number as a word`, found: numeral });
  }

  const used = [];
  for (const [, name] of narration.matchAll(BRACED)) {
    if (!known.has(name)) failures.push({ rule: "unknown_token", detail: `{${name}} is not a fork token`, found: name });
    else if (!used.includes(name)) used.push(name);
  }
  if (STRAY_BRACE.test(narration.replace(BRACED, ""))) {
    failures.push({ rule: "unknown_token", detail: "A brace that opens or closes no token", found: null });
  }

  for (const name of used) {
    if (isUnavailable(values[name])) failures.push({ rule: "null_token", detail: `{${name}} has no value for this fork`, found: name });
  }

  if (forkResult.substitutions.length > 0) {
    const mentions = splitSentences(narration).some((sentence) =>
      SUBSTITUTION_TOKENS.some((name) => sentence.includes(`{${name}}`)) && UNAVAILABLE.test(sentence));
    if (!mentions) {
      failures.push({
        rule: "substitution_unmentioned",
        detail: `The ghost could not take ${forkResult.substitutions.map((s) => s.withdrawn).join(", ")}, and no sentence says the choice was unavailable`,
        found: forkResult.substitutions.map((s) => s.withdrawn),
      });
    }
  }

  const lead = sameMoney(forkResult) ? SAME_MONEY_LEAD : null;
  splitSentences(narration).forEach((sentence, index) => {
    if (index === 0 && sentence === lead) return;
    // A brace that names no token is unknown_token's to report, and fails there
    if (sentence.match(BRACED)) return;
    failures.push({ rule: "sentence_without_token", detail: `"${sentence}" has no token in it, so nothing in it comes from the simulation`, found: sentence });
  });

  for (const [phrase] of narration.matchAll(CAUSAL)) {
    failures.push({ rule: "causal_claim", detail: `"${phrase}" claims a cause, and the engine keeps no attribution of a change to a choice`, found: phrase });
  }

  const printed = printTokens(values);
  return { ok: failures.length === 0, figures: used.map((token) => ({ token, value: values[token], text: printed[token] })), failures };
}
