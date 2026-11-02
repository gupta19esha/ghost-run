import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPlainNarration } from "../plain.js";
import handler, { forkKey } from "../../api/narrate.js";

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

test("only the demo life, and only a real fork of it", async () => {
  assert.equal((await call({ seed: 1, choices: save.choices, monthIndex: 15, option: "D16-B" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: save.choices.slice(0, 29), monthIndex: 15, option: "D16-B" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: save.choices, monthIndex: 15, option: "D99-Z" })).status, 400);
  assert.equal((await call({ seed: save.seed, choices: save.choices, monthIndex: "15", option: "D16-B" })).status, 400);
  assert.equal((await call({}, {}, "GET")).status, 405);
});

const d16 = { seed: save.seed, choices: save.choices, monthIndex: 15, option: "D16-B" };
const noNetwork = () => { throw new Error("called out"); };

test("meta with nothing cached falls back to Claude's committed cache, without calling out", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = noNetwork;
  try {
    const reply = await call(d16, { NARRATE_PROVIDER: "meta" });
    assert.equal(reply.status, 200);
    const cached = JSON.parse(readFileSync(new URL("../../cache/narrations/claude/7-e297f21a0571-15-D16-B/attempt-1.json", import.meta.url), "utf8"));
    assert.equal(reply.body.attempts.at(-1).narration, cached.narration);
  } finally {
    globalThis.fetch = real;
  }
});

test("meta allowed to call out but with no key falls back too, and never a 503", async () => {
  const reply = await call(d16, { NARRATE_PROVIDER: "meta", NARRATE_LIVE: "1" });
  assert.equal(reply.status, 200);
  assert.equal(isPlainNarration(reply.body.attempts.at(-1).narration), false, "Claude's cache, not the template");
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
