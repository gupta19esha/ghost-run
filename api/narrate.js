// POST /api/narrate: narrate one fork of a finished life. A Vercel serverless function; the browser
// calls it and never sees a key.
//
// Body: { seed, choices, monthIndex, option }, the save and the fork the ghost screen shows.
// Reply: { attempts: [{ number, narration, ok }], note? }, every attempt in order, the accepted one
// last when one passed. The browser checks each attempt again with verify() before showing it. note,
// on a player's own run only, says why its narration is the plain one when a limit was the reason.
//
// Two lives are narrated, differently:
//   The demo life is served from the committed cache only, and never calls a model, whatever the
//   environment says: its 64 forks are all cached, and the demo must not depend on a live call.
//   A miss falls back to Claude's committed cache, then the plain narration.
//   A player's own finished run is narrated live, by the same prompt, verifier and retry loop, within
//   the limits in agent/limits.js: five forks a run, and a ceiling on calls across every player.
//   Past either, or with no key or no store to count in, it gets the plain narration.
//
// The plain narration is built from the fork's figures with no model, and says so on the page.
//
// The route forks the save itself, so what it narrates is the simulation's, never figures sent in.
//
// Environment, read per request, set in Vercel's settings or .env.local, never committed:
//   NARRATE_PROVIDER  meta, claude or stub (the default). The browser cannot choose it
//   NARRATE_LIVE      1 lets a paid provider make calls, for own runs only
//   MODEL_API_KEY / ANTHROPIC_API_KEY  the provider's key
//   KV_REST_API_URL / KV_REST_API_TOKEN  the Redis that keeps the counts (agent/limits.js)

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fork } from "../runner/fork.js";
import { narrateFork } from "../agent/narration-loop.js";
import { CACHE_DIR, NarrationUnavailable, PROVIDERS } from "../agent/narrate.js";
import { KEEP_SECONDS, KEYS, LIVE_CALL_CEILING, LIVE_PER_RUN, redisStore } from "../agent/limits.js";

const DEMO = new URL("../web/demo/save.json", import.meta.url);
const FINISHED_MONTHS = 24;
const OPTION = /^D\d+-[A-Z]$/;
const MAX_CHOICES = 60;
// No attempt starts this late into a request, so the last one can finish inside the function's 60s
const START_BY_MS = 30_000;

export const NOTES = {
  run: `This run has had its ${LIVE_PER_RUN} live narrations, so this one is built from the figures.`,
  ceiling: "Live narration has reached its limit for now, so this one is built from the figures.",
  failed: "The narrator didn't get this fork past the check, so this one is built from the figures.",
};

async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  let text = "";
  for await (const chunk of req) text += chunk;
  return JSON.parse(text || "{}");
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

const digest = (choices) => createHash("sha256").update(choices.join(",")).digest("hex").slice(0, 12);

// The cache key for a fork of a save: its seed, a digest of its choices, the choice, the option
export function forkKey(save, monthIndex, option) {
  return `${save.seed}-${digest(save.choices)}-${monthIndex}-${option}`;
}

// A run, for the per-run limit: its seed and its choices
export const runId = (save) => `${save.seed}-${digest(save.choices)}`;

const attemptsOf = (log) => log.attempts.map(({ number, narration, ok }) => ({ number, narration, ok }));
const plain = async (result) => attemptsOf(await narrateFork(result, { provider: "stub", env: {} }));

export default async function handler(req, res, { env = process.env, cacheDir = CACHE_DIR, store } = {}) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "POST a fork to narrate" });
  }
  let input;
  try {
    input = await body(req);
  } catch {
    return send(res, 400, { error: "The body is not JSON" });
  }
  const { seed, choices, monthIndex, option } = input ?? {};
  if (!Number.isInteger(seed) || !Array.isArray(choices) || choices.length > MAX_CHOICES || !choices.every((c) => typeof c === "string" && OPTION.test(c))) {
    return send(res, 400, { error: "seed must be a whole number and choices a list of option ids" });
  }
  if (!Number.isInteger(monthIndex) || typeof option !== "string" || !OPTION.test(option)) {
    return send(res, 400, { error: "monthIndex must be a choice index and option an option id" });
  }
  const save = { seed, choices };
  let result;
  try {
    result = fork(save, monthIndex, option);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  const provider = env.NARRATE_PROVIDER || "stub";
  if (!PROVIDERS.includes(provider)) return send(res, 500, { error: "The narration provider is misconfigured" });

  const demo = JSON.parse(await readFile(DEMO, "utf8"));
  if (seed === demo.seed && choices.join(",") === demo.choices.join(",")) {
    return send(res, 200, { attempts: await demoNarration(result, { provider, key: forkKey(demo, monthIndex, option), env, cacheDir }) });
  }
  if (result.real.bars.at(-1)?.month !== FINISHED_MONTHS) {
    return send(res, 400, { error: "Only a finished chapter can be narrated" });
  }
  return send(res, 200, await ownNarration(result, { provider, run: runId(save), monthIndex, option, env, store: store ?? redisStore(env) }));
}

// The demo life: the provider's committed cache, then Claude's, then the plain narration. live is
// false on every ask, so no model is called here
async function demoNarration(result, { provider, key, env, cacheDir }) {
  const asks = [provider];
  if (provider !== "claude" && provider !== "stub") asks.push("claude");
  for (const ask of asks) {
    try {
      const log = await narrateFork(result, { provider: ask, live: false, key, env, cacheDir });
      if (log.accepted) return attemptsOf(log);
    } catch (error) {
      if (!(error instanceof NarrationUnavailable)) console.error("narrate:", error.message);
    }
  }
  return plain(result);
}

// A player's own run: what was narrated for this fork before, else a live narration within the limits,
// else the plain narration
async function ownNarration(result, { provider, run, monthIndex, option, env, store }) {
  const hasKey = provider === "meta" ? env.MODEL_API_KEY : provider === "claude" ? env.ANTHROPIC_API_KEY : null;
  if (env.NARRATE_LIVE !== "1" || !hasKey || !store) return { attempts: await plain(result) };
  const kept = KEYS.narration(run, monthIndex, option);
  const started = Date.now();
  try {
    const before = await store.get(kept);
    if (before) return { attempts: JSON.parse(before) };
    if (Number(await store.get(KEYS.calls) ?? 0) >= LIVE_CALL_CEILING) return { attempts: await plain(result), note: NOTES.ceiling };
    if (await store.incr(KEYS.run(run)) > LIVE_PER_RUN) return { attempts: await plain(result), note: NOTES.run };
  } catch (error) {
    // With no count to check against, nothing is narrated live
    console.error("narrate: store:", error.message);
    return { attempts: await plain(result) };
  }
  // Each call is counted before it is made, and not made past the ceiling or too late to finish
  let stoppedBy = null;
  const beforeCall = async () => {
    if (Date.now() - started > START_BY_MS) throw new NarrationUnavailable("Out of time for another attempt");
    if (await store.incr(KEYS.calls) > LIVE_CALL_CEILING) {
      stoppedBy = "ceiling";
      throw new NarrationUnavailable("The ceiling on live calls is reached");
    }
  };
  try {
    const log = await narrateFork(result, { provider, live: true, key: null, env, beforeCall });
    if (log.accepted) {
      const attempts = attemptsOf(log);
      await store.set(kept, JSON.stringify(attempts), KEEP_SECONDS).catch((error) => console.error("narrate: store:", error.message));
      return { attempts };
    }
  } catch (error) {
    // A provider's own error message can carry request details: log it here, say nothing to the page
    if (!(error instanceof NarrationUnavailable)) console.error("narrate:", error.message);
  }
  return { attempts: await plain(result), note: stoppedBy === "ceiling" ? NOTES.ceiling : NOTES.failed };
}
