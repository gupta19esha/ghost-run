// Every attempt at narrating a fork, checked and kept. A narrator offers one narration at a time;
// each goes through verify() and is recorded, accepted or not. A rejected attempt's failures go
// back to the narrator with the next request, and the first attempt that passes is the one shown.
// The rejected ones are kept so the checking can be seen: what was tried, and why it failed.
//
// attempt(next, forkResult, { maxAttempts, check }) -> Promise<{ attempts, accepted, rejected }>
//   next(previous)  -> Promise<narration>. previous is every attempt so far, oldest first, each
//                   with its failures: what the narrator is asked to fix
//   check(narration) -> more failures, { rule, detail, found }, for rules beyond verify()'s own
//   attempts         every narration tried, in order: { number, narration, ok, figures, failures }
//   accepted         the first attempt that passed, or null when none did in maxAttempts
//   rejected         the attempts that did not pass

import { verify } from "./verify.js";

export const MAX_ATTEMPTS = 4;

export async function attempt(next, forkResult, { maxAttempts = MAX_ATTEMPTS, check = () => [] } = {}) {
  const attempts = [];
  while (attempts.length < maxAttempts) {
    const narration = await next(attempts.slice());
    attempts.push(judge(narration, forkResult, attempts.length + 1, check));
    if (attempts.at(-1).ok) break;
  }
  return { attempts, accepted: attempts.find((a) => a.ok) ?? null, rejected: attempts.filter((a) => !a.ok) };
}

// One narration's verdict: verify()'s, with any further checks' failures after its own
export function judge(narration, forkResult, number, check = () => []) {
  const verified = verify(narration, forkResult);
  const failures = [...verified.failures, ...check(narration)];
  return { number, narration, ok: failures.length === 0, figures: verified.figures, failures };
}
