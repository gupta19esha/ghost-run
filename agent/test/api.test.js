import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPlainNarration, plainNarration } from "../plain.js";
import { KEYS, LIVE_CALL_CEILING, LIVE_PER_RUN, memoryStore } from "../limits.js";
import { alternativesAt, fork } from "../../runner/fork.js";
import handler, { forkKey, NOTES } from "../../api/narrate.js";

const save = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));

// A request and response as Vercel's Node runtime passes them, reduced to what the route uses
function call(body, env = {}, method = "POST", options = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(text) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(text) }); },
    };
    handler({ method, body }, res, { env, ...options });
  });
}

test("a fork of the demo life is narrated, every attempt returned", async () => {
  const reply = await call({ seed: save.seed, choices: save.choices, monthIndex: 15, option: "D16-B" });
  assert.equal(reply.status, 200);
  assert.equal(reply.body.attempts.length, 1);
  assert.ok(reply.body.attempts[0].ok);
  assert.match(reply.body.attempts[0].narration, /^The same money, a different life\./);
  assert.equal(reply.headers["cache-control"], "no-store");
  assert.deepEqual(Object.keys(reply.body), ["attempts"], "nothing names the model");
});

test("only a finished life that replays, and only a real fork of it", async () => {
  assert.equal((await call({ seed: save.seed, choices: save.choices.slice(0, 20), monthIndex: 15, option: "D16-B" })).status, 400, "not finished");
  assert.equal((await call({ seed: save.seed, choices: [...save.choices, "D99-A"], monthIndex: 15, option: "D16-B" })).status, 400, "choices left over");
  assert.equal((await call({ seed: "7", choices: save.choices, monthIndex: 15, option: "D16-B" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: ["x"], monthIndex: 0, option: "D01-B" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: save.choices, monthIndex: 15, option: "D99-Z" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: save.choices, monthIndex: "15", option: "D16-B" })).status, 400);
  assert.equal((await call({}, {}, "GET")).status, 405);
});

test("the demo life never calls a model, even with live calls on, a key, and nothing cached", async () => {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("called out"); };
  const cacheDir = mkdtempSync(join(tmpdir(), "route-"));
  try {
    const env = { NARRATE_PROVIDER: "meta", NARRATE_LIVE: "1", MODEL_API_KEY: "test-key" };
    const reply = await call(d16, env, "POST", { cacheDir, store: memoryStore() });
    assert.equal(reply.status, 200);
    assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration));
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = real;
    rmSync(cacheDir, { recursive: true });
  }
});

// ---------- A player's own run ----------

// A finished life that is not the demo's: the demo with D16-B taken, carried to month 24
const own = { seed: save.seed, choices: fork(save, 15, "D16-B").ghost.choices };
const ownForks = own.choices.flatMap((_, i) => alternativesAt(own, i).map((option) => ({ monthIndex: i, option })));
const live = { NARRATE_PROVIDER: "meta", NARRATE_LIVE: "1", MODEL_API_KEY: "test-key" };

// The fork being asked about, which the fake Meta below narrates
let current = null;

// Meta, faked: the plain narration less its stand-in sentence, which passes the check, with a typed
// figure on the first attempt when asked to make the commonest mistake
function fakeMeta({ mistakeFirst = false } = {}) {
  const asked = [];
  const fetchFn = async (url, init) => {
    const { messages } = JSON.parse(init.body);
    asked.push(messages.length);
    let text = plainNarration(current).replace(/ This account of month \{fork_month\} is a stand-in, written without a model\.$/, "");
    if (mistakeFirst && messages.length === 2) text = text.replace("{net_worth_gap}", "$1,234");
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: text }, finish_reason: "stop" }] }) };
  };
  return { asked, fetchFn };
}

async function ownCall(monthIndex, option, { env = live, store, fetchFn }) {
  current = fork(own, monthIndex, option);
  const real = globalThis.fetch;
  globalThis.fetch = fetchFn ?? (() => { throw new Error("called out"); });
  try {
    return await call({ ...own, monthIndex, option }, env, "POST", { store });
  } finally {
    globalThis.fetch = real;
  }
}

test("an own run is narrated live, its attempts true, and each call counted", async () => {
  const store = memoryStore();
  const meta = fakeMeta({ mistakeFirst: true });
  const { monthIndex, option } = ownForks[0];
  const reply = await ownCall(monthIndex, option, { store, fetchFn: meta.fetchFn });
  assert.equal(reply.status, 200);
  assert.deepEqual(reply.body.attempts.map((a) => a.ok), [false, true]);
  assert.ok(!isPlainNarration(reply.body.attempts.at(-1).narration));
  assert.equal(reply.body.note, undefined);
  assert.equal(store.values.get(KEYS.calls), "2");
  // Asked again, the same fork is served as it was, with no call
  const again = await ownCall(monthIndex, option, { store });
  assert.deepEqual(again.body, reply.body);
  assert.equal(store.values.get(KEYS.calls), "2");
});

test("five live narrations a run, then the plain one, saying why", async () => {
  const store = memoryStore();
  const meta = fakeMeta();
  for (const { monthIndex, option } of ownForks.slice(0, LIVE_PER_RUN)) {
    const reply = await ownCall(monthIndex, option, { store, fetchFn: meta.fetchFn });
    assert.ok(!isPlainNarration(reply.body.attempts.at(-1).narration));
  }
  const { monthIndex, option } = ownForks[LIVE_PER_RUN];
  const sixth = await ownCall(monthIndex, option, { store });
  assert.ok(isPlainNarration(sixth.body.attempts.at(-1).narration));
  assert.equal(sixth.body.note, NOTES.run);
  assert.equal(meta.asked.length, LIVE_PER_RUN);
});

test("past the ceiling, no call is made for anyone", async () => {
  const store = memoryStore();
  store.values.set(KEYS.calls, String(LIVE_CALL_CEILING));
  const { monthIndex, option } = ownForks[0];
  const reply = await ownCall(monthIndex, option, { store });
  assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration));
  assert.equal(reply.body.note, NOTES.ceiling);
  assert.equal(store.values.get(KEYS.calls), String(LIVE_CALL_CEILING));
});

test("the ceiling stops a narration mid-way, on the call that would pass it", async () => {
  const store = memoryStore();
  store.values.set(KEYS.calls, String(LIVE_CALL_CEILING - 1));
  const meta = fakeMeta({ mistakeFirst: true });
  const { monthIndex, option } = ownForks[0];
  const reply = await ownCall(monthIndex, option, { store, fetchFn: meta.fetchFn });
  assert.equal(meta.asked.length, 1);
  assert.equal(reply.body.note, NOTES.ceiling);
  assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration));
});

test("an own run with live calls off, no key, or no store gets the plain narration, with no call", async () => {
  const { monthIndex, option } = ownForks[0];
  for (const [env, store] of [[{ ...live, NARRATE_LIVE: undefined }, memoryStore()], [{ ...live, MODEL_API_KEY: undefined }, memoryStore()], [live, null]]) {
    const reply = await ownCall(monthIndex, option, { env, store });
    assert.equal(reply.status, 200);
    assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration));
    assert.equal(reply.body.note, undefined);
  }
});

const d16 = { seed: save.seed, choices: save.choices, monthIndex: 15, option: "D16-B" };
const noNetwork = () => { throw new Error("called out"); };

// A cache holding only Claude's answer for D16-B, whatever else is committed
const claudeOnlyCache = () => {
  const dir = mkdtempSync(join(tmpdir(), "route-"));
  const name = "claude/7-e297f21a0571-15-D16-B";
  mkdirSync(join(dir, name), { recursive: true });
  const text = readFileSync(new URL(`../../cache/narrations/${name}/attempt-1.json`, import.meta.url), "utf8");
  writeFileSync(join(dir, name, "attempt-1.json"), text);
  return { dir, narration: JSON.parse(text).narration };
};

test("meta with nothing cached falls back to Claude's committed cache, without calling out", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = noNetwork;
  const { dir, narration } = claudeOnlyCache();
  try {
    const reply = await call(d16, { NARRATE_PROVIDER: "meta" }, "POST", { cacheDir: dir });
    assert.equal(reply.status, 200);
    assert.equal(reply.body.attempts.at(-1).narration, narration);
  } finally {
    globalThis.fetch = real;
    rmSync(dir, { recursive: true });
  }
});

test("meta allowed to call out but with no key falls back too, and never a 503", async () => {
  const { dir, narration } = claudeOnlyCache();
  try {
    const reply = await call(d16, { NARRATE_PROVIDER: "meta", NARRATE_LIVE: "1" }, "POST", { cacheDir: dir });
    assert.equal(reply.status, 200);
    assert.equal(reply.body.attempts.at(-1).narration, narration);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("a provider that fails on the call falls back, and tells the page nothing of why", async () => {
  const real = globalThis.fetch;
  const quiet = console.error;
  console.error = () => {};
  globalThis.fetch = async () => ({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: { message: "secret detail" } }) });
  const cacheDir = mkdtempSync(join(tmpdir(), "route-"));
  try {
    const reply = await call(d16, { NARRATE_PROVIDER: "meta", NARRATE_LIVE: "1", MODEL_API_KEY: "test-key" }, "POST", { cacheDir });
    assert.equal(reply.status, 200);
    assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration));
    assert.doesNotMatch(JSON.stringify(reply.body), /secret detail/);
  } finally {
    globalThis.fetch = real;
    console.error = quiet;
    rmSync(cacheDir, { recursive: true });
  }
});

test("with no cache at all, the last word is the plain narration, which says no model wrote it", async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "route-"));
  try {
    for (const provider of ["meta", "claude"]) {
      const reply = await call(d16, { NARRATE_PROVIDER: provider }, "POST", { cacheDir });
      assert.equal(reply.status, 200, provider);
      assert.ok(isPlainNarration(reply.body.attempts.at(-1).narration), provider);
    }
  } finally {
    rmSync(cacheDir, { recursive: true });
  }
});

test("fork keys are stable and distinct", () => {
  assert.equal(forkKey(save, 15, "D16-B"), forkKey(save, 15, "D16-B"));
  assert.notEqual(forkKey(save, 15, "D16-B"), forkKey(save, 15, "D16-C"));
});
