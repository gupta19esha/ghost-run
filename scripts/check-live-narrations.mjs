// Asks the live route for every fork of the demo life, as the browser does, and compares each answer
// with the cache committed for one provider. Cached answers cost nothing.
//
// node scripts/check-live-narrations.mjs [--provider=meta] [--origin=https://ghost-run.vercel.app]
//
// Exits 1 unless every fork answers 200, from that provider's cache, and passes the page's own check.

import { readFileSync } from "node:fs";
import { forksOf } from "../agent/rank.js";
import { forkKey } from "../api/narrate.js";
import { checkAttempts } from "../web/ghost-model.js";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const provider = arg("provider", "claude");
const origin = arg("origin", "https://ghost-run.vercel.app");

const save = JSON.parse(readFileSync(new URL("../web/demo/save.json", import.meta.url), "utf8"));
const cached = (key, n) => {
  try {
    return JSON.parse(readFileSync(new URL(`../cache/narrations/${provider}/${key}/attempt-${n}.json`, import.meta.url), "utf8")).narration;
  } catch {
    return null;
  }
};

const problems = [];
const forks = forksOf(save);
for (const f of forks) {
  const key = forkKey(save, f.monthIndex, f.option);
  const res = await fetch(`${origin}/api/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed: save.seed, choices: save.choices, monthIndex: f.monthIndex, option: f.option }),
  });
  const text = await res.text();
  if (res.status !== 200) {
    problems.push(`${f.option}: HTTP ${res.status}: ${text.slice(0, 100)}`);
    continue;
  }
  const { attempts } = JSON.parse(text);
  if (!attempts.every((a) => a.narration === cached(key, a.number))) problems.push(`${f.option}: not what is cached for ${provider}`);
  const checked = checkAttempts(f.fork, attempts);
  if (!checked.rendered || !checked.agrees) problems.push(`${f.option}: the page's own check rejects it`);
}
console.log(`${forks.length} forks from ${origin}.`);
if (problems.length) {
  console.log(`${problems.length} problems:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Every fork matches the ${provider} cache.`);
