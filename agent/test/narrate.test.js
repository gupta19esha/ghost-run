import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrate, conversation, NarrationUnavailable } from "../narrate.js";
import { narrateFork } from "../narration-loop.js";
import { SYSTEM, brief, rejection, sameMoney, SAME_MONEY_LEAD } from "../prompt.js";
import { forksOf } from "../rank.js";
import { fork } from "../../runner/fork.js";

const save = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));
const substituted = fork(save, 15, "D16-B");   // same money, and D20-B withdrawn
const plain = fork(save, 1, "D02-C");          // neither
const literal = (text) => new RegExp(text.replace(/[.,*+?^${}()|[\]\\]/g, "\\$&"));

test("the stub narrates every fork of the demo, accepted on the first attempt", async () => {
  for (const f of forksOf(save)) {
    const log = await narrateFork(f.fork, { provider: "stub" });
    assert.equal(log.attempts.length, 1, f.option);
    assert.ok(log.accepted, `${f.option}: ${JSON.stringify(log.attempts[0].failures)}`);
    assert.equal(log.accepted.narration.startsWith(SAME_MONEY_LEAD), sameMoney(f.fork) !== null);
  }
});

test("a rejected attempt's failures go back, and the retry fixes them", async () => {
  const log = await narrateFork(substituted, { provider: "stub", env: { NARRATE_STUB_MISTAKES: "1" } });
  assert.deepEqual(log.attempts.map((a) => a.ok), [false, true]);
  assert.deepEqual([...new Set(log.rejected[0].failures.map((f) => f.rule))], ["numeral"]);
});

test("the conversation carries every earlier attempt and its rejection", () => {
  const previous = [{ narration: "First try.", failures: [{ rule: "numeral", found: "24" }] }];
  const messages = conversation(substituted, previous);
  assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.equal(messages[1].content, "First try.");
  assert.match(messages[2].content, /contains a digit/);
});

test("the prompt: tokens, no digits, the substitution, the voice, no advice, the lead", () => {
  assert.match(SYSTEM, /You never write a number\. Not one digit, anywhere/);
  assert.match(SYSTEM, /Never give advice/);
  assert.match(SYSTEM, /not available on this path/);
  assert.match(SYSTEM, literal(SAME_MONEY_LEAD));
  assert.match(SYSTEM, /Works fine\. Looks bad\./);
  assert.doesNotMatch(SYSTEM, /\d/, "the system prompt itself has no digits to copy");
  const withSub = brief(substituted);
  assert.match(withSub, /You must say so/);
  assert.match(withSub, /Lead on it/);
  assert.match(withSub, /\{net_worth_gap\}: .* Prints: 300 more/);
  const without = brief(plain);
  assert.doesNotMatch(without, /You must say so|Lead on it/);
  assert.match(rejection([{ rule: "lead" }]), literal(SAME_MONEY_LEAD));
});

// A Meta response, shaped as Meta's chat completions return one
const metaReply = (text) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text }, finish_reason: "stop" }], usage: { completion_tokens: 50 } }) });

test("every response is cached by fork and attempt; the same fork again costs nothing", async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "narrations-"));
  try {
    let calls = 0;
    const fetchFn = async (url, init) => {
      calls++;
      assert.equal(url, "https://api.meta.ai/v1/chat/completions");
      assert.equal(init.headers.Authorization, "Bearer test-key");
      const body = JSON.parse(init.body);
      assert.equal(body.model, "muse-spark-1.3");
      assert.equal(body.messages[0].role, "system");
      return metaReply(body.messages.length === 2 ? "By month 24 the ghost is ahead." : "By month {end_month} the ghost has {net_worth_gap}.");
    };
    const options = { provider: "meta", key: "fork-1", cacheDir, env: { MODEL_API_KEY: "test-key" }, fetch: fetchFn };
    const first = await narrateFork(plain, options);
    assert.deepEqual(first.attempts.map((a) => a.ok), [false, true]);
    assert.equal(calls, 2);
    assert.deepEqual(readdirSync(join(cacheDir, "meta", "fork-1")).sort(), ["attempt-1.json", "attempt-2.json"]);
    const cached = readFileSync(join(cacheDir, "meta", "fork-1", "attempt-1.json"), "utf8");
    assert.ok(!cached.includes("test-key"), "the key is never written");

    const again = await narrateFork(plain, { ...options, live: false });
    assert.equal(calls, 2, "served from the cache, with no network");
    assert.deepEqual(again.attempts.map((a) => a.narration), first.attempts.map((a) => a.narration));
  } finally {
    rmSync(cacheDir, { recursive: true, force: true });
  }
});

test("with live calls off, a fork with nothing cached says so instead of calling", async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "narrations-"));
  try {
    await assert.rejects(
      narrate(plain, { provider: "meta", key: "none", cacheDir, live: false, env: {}, fetch: () => assert.fail("no network") }),
      NarrationUnavailable);
  } finally {
    rmSync(cacheDir, { recursive: true, force: true });
  }
});

test("a missing key is reported, and an unknown provider refused", async () => {
  await assert.rejects(narrate(plain, { provider: "meta", env: {} }), /MODEL_API_KEY is not set/);
  await assert.rejects(narrate(plain, { provider: "claude", env: {} }), /ANTHROPIC_API_KEY is not set/);
  await assert.rejects(narrate(plain, { provider: "gpt" }), /Unknown narration provider/);
});
