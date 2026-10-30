import { test } from "node:test";
import assert from "node:assert/strict";
import { attempt, judge, MAX_ATTEMPTS } from "../attempts.js";
import { verify } from "../verify.js";
import { fork } from "../../runner/fork.js";
import { typeSave } from "../../scripts/player-saves.mjs";

const result = fork(typeSave("cautious"), 1, "D02-A");
const good = "By month {end_month} the ghost has {net_worth_gap}.";
const typed = "By month 24 the ghost has {net_worth_gap}.";
const invented = "The ghost retires {retirement_years_earlier} years sooner.";
const drafts = (list) => async (previous) => list[previous.length];

test("every attempt is kept, the rejected ones with verify()'s reasons", async () => {
  const log = await attempt(drafts([typed, invented, good]), result);
  assert.deepEqual(log.attempts.map((a) => [a.number, a.ok]), [[1, false], [2, false], [3, true]]);
  assert.equal(log.accepted, log.attempts[2]);
  assert.deepEqual(log.rejected, log.attempts.slice(0, 2));
  for (const a of log.attempts) {
    const { ok, figures, failures } = verify(a.narration, result);
    assert.deepEqual({ ok: a.ok, figures: a.figures, failures: a.failures }, { ok, figures, failures });
  }
  assert.deepEqual(log.rejected.map((a) => a.failures.map((f) => [f.rule, f.found])), [[["numeral", "24"]], [["unknown_token", "retirement_years_earlier"]]]);
});

test("each request sees every earlier attempt with its failures, and nothing is asked after a pass", async () => {
  const seen = [];
  const log = await attempt(async (previous) => {
    seen.push(previous.map((a) => a.failures.map((f) => f.rule)));
    return [typed, good, invented][previous.length];
  }, result);
  assert.deepEqual(seen, [[], [["numeral"]]]);
  assert.equal(log.attempts.length, 2);
});

test(`it stops at ${MAX_ATTEMPTS} attempts, with nothing accepted`, async () => {
  const log = await attempt(async () => typed, result);
  assert.equal(log.attempts.length, MAX_ATTEMPTS);
  assert.equal(log.accepted, null);
  assert.equal(log.rejected.length, MAX_ATTEMPTS);
});

test("a further check's failures join verify()'s", () => {
  const verdict = judge(good, result, 1, () => [{ rule: "lead", detail: "x", found: null }]);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.failures.map((f) => f.rule), ["lead"]);
  assert.equal(verdict.figures.length, 2);
});
