// POST /api/narrate: narrate one fork of the demo life. A Vercel serverless function; the browser
// calls it and never sees a key.
//
// Body: { seed, choices, monthIndex, option }, the save and the fork the ghost screen shows.
// Reply: { attempts: [{ number, narration, ok }] }, every attempt in order, the accepted one last
// when one passed. The browser checks each attempt again with verify() before showing it.
//
// The route forks the save itself, so what it narrates is the simulation's, never figures sent in.
// Only the demo save is accepted: the screen shows nothing else, and it keeps the number of forks
// a paid model can be asked about finite.
//
// Environment, read per request, set in Vercel's settings or .env.local, never committed:
//   NARRATE_PROVIDER  meta, claude or stub (the default). The browser cannot choose it
//   NARRATE_LIVE      1 lets a paid provider make calls. Otherwise it answers from the committed
//                     cache only, with no network, and a fork with no cached narration says so
//   MODEL_API_KEY / ANTHROPIC_API_KEY  the provider's key

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fork } from "../runner/fork.js";
import { narrateFork } from "../agent/narration-loop.js";
import { NarrationUnavailable, PROVIDERS } from "../agent/narrate.js";

const DEMO = new URL("../web/demo/save.json", import.meta.url);

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

// The cache key for a fork of a save: its seed, a digest of its choices, the choice, the option
export function forkKey(save, monthIndex, option) {
  const choices = createHash("sha256").update(save.choices.join(",")).digest("hex").slice(0, 12);
  return `${save.seed}-${choices}-${monthIndex}-${option}`;
}

export default async function handler(req, res, { env = process.env } = {}) {
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
  const demo = JSON.parse(await readFile(DEMO, "utf8"));
  const { seed, choices, monthIndex, option } = input ?? {};
  if (seed !== demo.seed || !Array.isArray(choices) || choices.join(",") !== demo.choices.join(",")) {
    return send(res, 400, { error: "Only the demo life can be narrated" });
  }
  if (!Number.isInteger(monthIndex) || typeof option !== "string" || !/^D\d+-[A-Z]$/.test(option)) {
    return send(res, 400, { error: "monthIndex must be a choice index and option an option id" });
  }

  let result;
  try {
    result = fork(demo, monthIndex, option);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  const provider = env.NARRATE_PROVIDER || "stub";
  if (!PROVIDERS.includes(provider)) return send(res, 500, { error: "The narration provider is misconfigured" });
  try {
    const log = await narrateFork(result, { provider, key: forkKey(demo, monthIndex, option), live: env.NARRATE_LIVE === "1", env });
    return send(res, 200, { attempts: log.attempts.map(({ number, narration, ok }) => ({ number, narration, ok })) });
  } catch (error) {
    if (error instanceof NarrationUnavailable) return send(res, 503, { error: `No narration for this fork yet: ${error.message}` });
    // A provider's own error message can carry request details: log it here, say less to the page
    console.error("narrate:", error.message);
    return send(res, 502, { error: "The narrator could not be reached" });
  }
}
