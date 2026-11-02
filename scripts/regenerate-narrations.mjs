// Narrates every fork of the demo life with one provider, and writes each response to
// cache/narrations/<provider>/. The same command resumes: whatever is already cached for the same
// request costs nothing and is not asked again, so after a rate limit or a failure just run it again.
//
// npm run narrate:meta                       every fork, on Meta's model
// npm run narrate:meta -- --only=D16-B,D19-A a few first, to read them before paying for the rest
// npm run narrate:meta -- --dry-run          what would be asked, and what is cached: no key, no calls
// npm run narrate:claude                     the same, on Claude
//
// The key comes from .env.local, read by Node (--env-file), and is never printed. Exits 1 if any
// fork has no accepted narration.

import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { forksOf } from "../agent/rank.js";
import { narrateFork } from "../agent/narration-loop.js";
import { CACHE_DIR, META, PROVIDERS } from "../agent/narrate.js";
import { forkKey } from "../api/narrate.js";

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const provider = arg("provider");
const only = arg("only")?.split(",") ?? null;
const dryRun = process.argv.includes("--dry-run");

const KEYS = { meta: "MODEL_API_KEY", claude: "ANTHROPIC_API_KEY" };
// Dollars per million tokens, from each provider's pricing page, for the estimate at the end
const PRICES = { "muse-spark-1.3": [1.25, 4.25], "muse-spark-1.3-contributor": [0.1, 0.2], "muse-wonder-1.0": [4, 20], "claude-opus-5-5": [4, 20], "claude-haiku-5-5": [0.1, 0.5] };

if (!PROVIDERS.includes(provider) || !KEYS[provider]) {
  console.error(`--provider must be ${Object.keys(KEYS).join(" or ")}`);
  process.exit(2);
}
const keyName = KEYS[provider];
const secret = process.env[keyName];
const scrub = (text) => (secret ? String(text).split(secret).join("[key]") : String(text));
if (!secret && !dryRun) {
  console.error(`${keyName} is not set. Add it to .env.local, and run this through npm run, which reads that file.`);
  process.exit(2);
}

const save = JSON.parse(readFileSync(new URL("../web/demo/save.json", import.meta.url), "utf8"));
const forks = forksOf(save).filter((f) => !only || only.includes(f.option));
if (only && forks.length !== only.length) {
  console.error(`--only named a fork the demo life does not have: ${only.filter((o) => !forks.some((f) => f.option === o)).join(", ")}`);
  process.exit(2);
}
const model = provider === "meta" ? process.env.NARRATE_META_MODEL || META.model : process.env.NARRATE_CLAUDE_MODEL || "claude-opus-5-5";
console.log(`${provider}, ${model}: ${forks.length} forks${dryRun ? " (dry run: no calls)" : ""}`);

const dir = join(CACHE_DIR, provider);
const filesOf = (key) => {
  try {
    return readdirSync(join(dir, key)).map((name) => join(dir, key, name));
  } catch {
    return [];
  }
};

if (dryRun) {
  const cached = forks.filter((f) => filesOf(forkKey(save, f.monthIndex, f.option)).length > 0).length;
  console.log(`${cached} have a cached response, ${forks.length - cached} have none. A cached response is reused only if it answered this exact prompt and model.`);
  process.exit(0);
}

const env = { ...process.env, NARRATE_PROVIDER: provider, NARRATE_LIVE: "1" };
const failed = [];
let retried = 0;
// A few at a time: each call can take a minute. A bad key or an empty account fails the same way on
// every fork, so the first such failure stops the rest
const WORKERS = Number(arg("workers") ?? 4);
let next = 0;
let stopped = false;
async function worker() {
  while (next < forks.length && !stopped) {
    const index = next++;
    const f = forks[index];
    const key = forkKey(save, f.monthIndex, f.option);
    const label = `${String(index + 1).padStart(2)}/${forks.length} ${f.option}`;
    try {
      const log = await narrateFork(f.fork, { provider, key, live: true, env });
      // A shorter run than last time leaves later attempts behind, which answered nothing now
      for (const file of filesOf(key)) {
        if (Number(file.match(/attempt-(\d+)\.json$/)?.[1]) > log.attempts.length) rmSync(file);
      }
      if (log.attempts.length > 1) retried += 1;
      if (log.accepted) console.log(`${label} accepted on attempt ${log.accepted.number}`);
      else {
        failed.push(f.option);
        console.log(`${label} NONE PASSED in ${log.attempts.length}: ${[...new Set(log.rejected.flatMap((a) => a.failures.map((x) => x.rule)))].join(", ")}`);
      }
    } catch (error) {
      failed.push(f.option);
      const message = scrub(error.message);
      console.log(`${label} ERROR ${message}`);
      if (/\b(401|402|403)\b/.test(message)) {
        stopped = true;
        console.log("Stopping: this will fail the same way on every fork. Check the key and the account's credit.");
      }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(WORKERS, forks.length) }, worker));

let [input, output, reasoning, files] = [0, 0, 0, 0];
for (const f of forks) {
  for (const file of filesOf(forkKey(save, f.monthIndex, f.option))) {
    if (!statSync(file).isFile()) continue;
    const usage = JSON.parse(readFileSync(file, "utf8")).usage ?? {};
    files += 1;
    input += usage.prompt_tokens ?? usage.input_tokens ?? 0;
    output += usage.completion_tokens ?? usage.output_tokens ?? 0;
    reasoning += usage.completion_tokens_details?.reasoning_tokens ?? usage.output_tokens_details?.thinking_tokens ?? 0;
  }
}
const price = PRICES[model];
console.log(`\n${forks.length - failed.length} of ${forks.length} accepted this run, ${retried} needed a retry, ${files} responses on disk for these forks.`);
console.log(`Tokens across those responses: ${input} in, ${output} out (of which ${reasoning} reasoning).`);
if (price) console.log(`About $${((input * price[0] + output * price[1]) / 1e6).toFixed(2)} at list price, counting cached responses as if paid again.`);
if (failed.length) {
  console.log(`No accepted narration: ${failed.join(", ")}. Run the same command again to retry these; the rest are cached.`);
  process.exit(1);
}
