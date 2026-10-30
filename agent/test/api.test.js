import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler, { forkKey } from "../../api/narrate.js";

const save = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));

// A request and response as Vercel's Node runtime passes them, reduced to what the route uses
function call(body, env = {}, method = "POST") {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(text) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(text) }); },
    };
    handler({ method, body }, res, { env });
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

test("a paid provider with live calls off and nothing cached answers 503, without calling out", async () => {
  const reply = await call({ seed: save.seed, choices: save.choices, monthIndex: 1, option: "D02-A" }, { NARRATE_PROVIDER: "meta" });
  assert.equal(reply.status, 503);
  assert.match(reply.body.error, /No narration for this fork yet/);
});

test("fork keys are stable and distinct", () => {
  assert.equal(forkKey(save, 15, "D16-B"), forkKey(save, 15, "D16-B"));
  assert.notEqual(forkKey(save, 15, "D16-B"), forkKey(save, 15, "D16-C"));
});
