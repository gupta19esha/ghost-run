// Narrate a fork until a narration passes: generate, check, and on failure send the failures back
// and ask again, up to MAX_ATTEMPTS. Every attempt is kept (verify/attempts.js).
//
// narrateFork(forkResult, { provider, key, live, ... }) -> Promise<{ attempts, accepted, rejected }>
// The options after provider pass through to agent/narrate.js.

import { attempt, MAX_ATTEMPTS } from "../verify/attempts.js";
import { narrate } from "./narrate.js";
import { leadCheck } from "./checks.js";

export async function narrateFork(forkResult, { maxAttempts = MAX_ATTEMPTS, ...options } = {}) {
  return attempt(
    (previous) => narrate(forkResult, { ...options, attempt: previous.length + 1, previous }),
    forkResult,
    { maxAttempts, check: leadCheck(forkResult) },
  );
}
