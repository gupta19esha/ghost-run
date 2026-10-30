// Checks on a narration beyond verify()'s figures, run on the server in the retry loop and again
// in the browser for the panel. One for now: a same-money fork must lead on it.
//
// leadCheck(forkResult) -> (narration) -> failures, each { rule, detail, found }

import { sameMoney, SAME_MONEY_LEAD } from "./prompt.js";

export function leadCheck(forkResult) {
  const bar = sameMoney(forkResult);
  return (narration) => (bar && !narration.trim().startsWith(SAME_MONEY_LEAD)
    ? [{ rule: "lead", detail: `A same-money fork must open with "${SAME_MONEY_LEAD}"`, found: null }]
    : []);
}
