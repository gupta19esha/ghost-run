import { test } from "node:test";
import assert from "node:assert/strict";
import { attempt } from "../attempts.js";
import { verify } from "../verify.js";
import { fork } from "../../runner/fork.js";
import { typeSave } from "../../scripts/player-saves.mjs";

const result = fork(typeSave("cautious"), 1, "D02-A");
const good = "By month {end_month} the ghost has {net_worth_gap}.";
const typed = "By month 24 the ghost has {net_worth_gap}.";
const invented = "The ghost retires {retirement_years_earlier} years sooner.";

test("every attempt is kept, the rejected ones with verify()'s reasons", () => {
  const log = attempt([typed, invented, good], result);
  assert.deepEqual(log.attempts.map((a) => [a.number, a.ok]), [[1, false], [2, false], [3, true]]);
  assert.equal(log.accepted, log.attempts[2]);
  assert.deepEqual(log.rejected, log.attempts.slice(0, 2));
  for (const a of log.attempts) {
    const { ok, figures, failures } = verify(a.narration, result);
    assert.deepEqual({ ok: a.ok, figures: a.figures, failures: a.failures }, { ok, figures, failures });
  }
  assert.deepEqual(log.rejected.map((a) => a.failures.map((f) => [f.rule, f.found])), [[["numeral", "24"]], [["unknown_token", "retirement_years_earlier"]]]);
});

test("nothing after the accepted attempt is asked for", () => {
  let asked = 0;
  function* drafts() { for (const d of [typed, good, invented]) { asked++; yield d; } }
  const log = attempt(drafts(), result);
  assert.equal(asked, 2);
  assert.equal(log.attempts.length, 2);
});

test("when none passes, nothing is accepted and every attempt is still kept", () => {
  const log = attempt([typed, invented], result);
  assert.equal(log.accepted, null);
  assert.equal(log.rejected.length, 2);
});
