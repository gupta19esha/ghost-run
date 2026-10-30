// One candidate narration for a fork. Server-side only: the browser calls api/narrate.js, which
// calls this, and never sees a key.
//
// narrate(forkResult, { provider, attempt, previous, key, ... }) -> Promise<narration>
//   provider  "meta", "claude" or "stub". This file is the only place that knows which model
//             answered: nothing it returns names one
//   attempt   1 for the first try. previous: the attempts before this one, each with its
//             failures, which go to the model as the conversation so far
//   key       the fork's cache key. Every model response is cached on disk at
//             cache/narrations/<provider>/<key>/attempt-<n>.json, so the same fork costs nothing
//             the second time. A cached response is used only while the request it answered is
//             unchanged: a new prompt, or new feedback, asks again
//   live      false serves from the cache only, with no network; a miss throws NarrationUnavailable
//
// Keys come from the environment, read when a call is made, never stored: MODEL_API_KEY for
// Meta (the name Meta's docs use), ANTHROPIC_API_KEY for Claude.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SYSTEM, brief, rejection, sameMoney, SAME_MONEY_LEAD } from "./prompt.js";
import { resolveTokens } from "../verify/tokens.js";
import { FORMATS } from "../verify/render.js";

export const PROVIDERS = ["meta", "claude", "stub"];
export const CACHE_DIR = fileURLToPath(new URL("../cache/narrations/", import.meta.url));

// Meta's Model API (dev.meta.ai/docs): chat completions at api.meta.ai. Muse Spark is the model
// Meta recommends for high-volume, cost-sensitive work; standard mode, since contributor mode
// lets Meta train on prompts and responses. Low reasoning, as Meta advises for direct tasks:
// reasoning tokens count against max_completion_tokens and are billed as output
const META = {
  url: "https://api.meta.ai/v1/chat/completions",
  model: "muse-spark-1.3",
  reasoning_effort: "low",
  max_completion_tokens: 4000,
};
const CLAUDE = { model: "claude-opus-5-5", effort: "medium", max_tokens: 16000 };

export class NarrationUnavailable extends Error {}

// The conversation for this attempt: the brief, then each earlier attempt and why it was rejected
export function conversation(forkResult, previous = []) {
  const messages = [{ role: "user", content: brief(forkResult) }];
  for (const a of previous) {
    messages.push({ role: "assistant", content: a.narration });
    messages.push({ role: "user", content: rejection(a.failures) });
  }
  return messages;
}

const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function narrate(forkResult, {
  provider,
  attempt = 1,
  previous = [],
  key = null,
  live = true,
  cacheDir = CACHE_DIR,
  env = process.env,
  fetch: fetchFn = globalThis.fetch,
  anthropic = null,
} = {}) {
  if (!PROVIDERS.includes(provider)) throw new Error(`Unknown narration provider ${JSON.stringify(provider)}`);
  if (provider === "stub") return stub(forkResult, attempt, previous, env);

  const messages = conversation(forkResult, previous);
  const model = provider === "meta" ? env.NARRATE_META_MODEL || META.model : env.NARRATE_CLAUDE_MODEL || CLAUDE.model;
  const request = sha({ provider, model, system: SYSTEM, messages });
  const file = key ? `${cacheDir}/${provider}/${key}/attempt-${attempt}.json` : null;

  if (file) {
    const cached = await readFile(file, "utf8").then(JSON.parse, () => null);
    if (cached && cached.request === request) return cached.narration;
  }
  if (!live) throw new NarrationUnavailable(`No cached narration for attempt ${attempt} of this fork, and live calls are off`);

  const { narration, usage } = provider === "meta"
    ? await callMeta({ model, messages, env, fetchFn })
    : await callClaude({ model, messages, env, anthropic });

  if (file) {
    // Read-only filesystems, such as a deployed function's, keep no cache: the call still answers
    try {
      await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
      await writeFile(file, JSON.stringify({ provider, model, attempt, request, narration, usage, at: new Date().toISOString() }, null, 2) + "\n");
    } catch {}
  }
  return narration;
}

// ---------- Meta ----------

const RETRYABLE = new Set([429, 500, 503]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callMeta({ model, messages, env, fetchFn }) {
  const apiKey = env.MODEL_API_KEY;
  if (!apiKey) throw new NarrationUnavailable("MODEL_API_KEY is not set");
  const body = JSON.stringify({
    model,
    messages: [{ role: "system", content: SYSTEM }, ...messages],
    reasoning_effort: META.reasoning_effort,
    max_completion_tokens: META.max_completion_tokens,
  });
  // Meta's error guide: retry 429, 500 and 503 with backoff, honouring Retry-After; never 4xx
  for (let tryNumber = 0; ; tryNumber++) {
    const response = await fetchFn(META.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
    });
    if (response.ok) {
      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice?.message?.content) throw new Error(`Meta returned no text (finish_reason ${choice?.finish_reason ?? "none"})`);
      if (choice.finish_reason === "length") throw new Error("Meta's narration was cut off at the token limit");
      return { narration: choice.message.content.trim(), usage: data.usage ?? null };
    }
    if (!RETRYABLE.has(response.status) || tryNumber >= 2) {
      const detail = await response.json().then((d) => d.error?.message, () => null);
      throw new Error(`Meta ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    const after = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(after) && after > 0 ? Math.min(after, 10) * 1000 : (2 ** tryNumber) * 800 + Math.random() * 500);
  }
}

// ---------- Claude ----------

async function callClaude({ model, messages, env, anthropic }) {
  let client = anthropic;
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) throw new NarrationUnavailable("ANTHROPIC_API_KEY is not set");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  const response = await client.beta.messages.create({
    model,
    max_tokens: CLAUDE.max_tokens,
    output_config: { effort: CLAUDE.effort },
    // On a policy decline the API re-runs the request on a fallback model in the same call
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages,
  });
  if (response.stop_reason === "refusal") throw new Error(`Claude declined (${response.stop_details?.category ?? "no category"})`);
  if (response.stop_reason === "max_tokens") throw new Error("Claude's narration was cut off at the token limit");
  const narration = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!narration) throw new Error("Claude returned no text");
  return { narration, usage: response.usage ?? null };
}

// ---------- Stub ----------

// No model and no network: a narration built from the fork's tokens, the way a model is asked to
// write one, so the whole path can be exercised for free. NARRATE_STUB_MISTAKES=1 makes its first
// attempt type a figure into the text, the commonest real mistake, and it corrects it only once
// the rejection says so: the retry loop, end to end
function stub(forkResult, attempt, previous, env) {
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
  sentences.push("This narration is a stand-in, written without a model.");
  const narration = sentences.join(" ");
  const toldAboutDigits = previous.some((a) => a.failures.some((f) => f.rule === "numeral"));
  if (env.NARRATE_STUB_MISTAKES === "1" && !toldAboutDigits) {
    return narration.replace("{net_worth_gap}", FORMATS.net_worth_gap(values.net_worth_gap));
  }
  return narration;
}
