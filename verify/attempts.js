// Every attempt at narrating a fork, checked and kept. A narrator, the placeholder drafts now and
// a model later, offers narrations one at a time; each goes through verify() and is recorded,
// accepted or not, and the first that passes is the one shown. The rejected ones are kept so the
// checking can be seen: what was tried, and why it did not get through.
//
// attempt(candidates, forkResult) -> { attempts, accepted, rejected }
//   candidates  an iterable of narrations, read lazily: nothing after the accepted one is asked for
//   attempts    every narration tried, in order: { number, narration, ok, figures, failures }
//   accepted    the first attempt that passed, or null when none did
//   rejected    the attempts that did not pass

import { verify } from "./verify.js";

export function attempt(candidates, forkResult) {
  const attempts = [];
  for (const narration of candidates) {
    attempts.push({ number: attempts.length + 1, narration, ...verify(narration, forkResult) });
    if (attempts.at(-1).ok) break;
  }
  return { attempts, accepted: attempts.find((a) => a.ok) ?? null, rejected: attempts.filter((a) => !a.ok) };
}
