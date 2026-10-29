import { test } from "node:test";
import assert from "node:assert/strict";

import { fork } from "../../runner/fork.js";
import { resolveTokens, TOKENS, SUBSTITUTION_TOKENS } from "../tokens.js";
import { indexSave } from "../../scripts/player-saves.mjs";

const save = indexSave();
const d16 = save.choices.indexOf("D16-A");
const d20 = save.choices.indexOf("D20-A");

test("every token resolves, and no name outside the list", () => {
  const values = resolveTokens(fork(save, d16, "D16-C"));
  assert.deepEqual(Object.keys(values).sort(), [...TOKENS].sort());
  for (const name of TOKENS) assert.match(name, /^[a-z_]+$/);
  for (const name of SUBSTITUTION_TOKENS) assert.ok(TOKENS.includes(name));
});

test("a fork with a substitution: the fork point, the endpoints, the gap and the substitute", () => {
  const result = fork(save, d16, "D16-C");
  const v = resolveTokens(result);
  assert.equal(v.fork_decision, "D16");
  assert.equal(v.fork_month, 10);
  assert.equal(v.real_choice, "5,000 a month into a broad equity index");
  assert.equal(v.ghost_choice, "Wait until you earn more");
  assert.equal(v.end_month, 24);
  const realEnd = result.real.bars.at(-1);
  const ghostEnd = result.ghost.bars.at(-1);
  assert.equal(v.real_net_worth, realEnd.netWorth);
  assert.equal(v.ghost_net_worth, ghostEnd.netWorth);
  assert.equal(v.net_worth_gap, ghostEnd.netWorth - realEnd.netWorth);
  for (const bar of ["safety", "freedom", "life"]) {
    assert.equal(v[`real_${bar}`], realEnd[bar]);
    assert.equal(v[`ghost_${bar}`], ghostEnd[bar]);
    assert.equal(v[`${bar}_gap`], ghostEnd[bar] - realEnd[bar]);
  }
  // D16's monthly money starts the month after the decision, so month 10 is still the same
  assert.equal(v.identical_months, 10);
  assert.equal(v.first_divergent_month, 11);
  assert.equal(v.substitution_count, 1);
  assert.equal(v.substituted_decision, "D20");
  assert.equal(v.substitution_month, 14);
  assert.equal(v.withdrawn_choice, "Move your monthly investment there");
  assert.equal(v.substitute_choice, "Ignore it");
  assert.equal(result.substitutions[0].monthIndex, d20);
});

test("a ghost the rule ended has no substitute, and ends where it stopped", () => {
  const v = resolveTokens(fork(save, d16, "D16-C", { substitution: "keep-real-or-stop" }));
  assert.equal(v.substitute_choice, null);
  assert.equal(v.withdrawn_choice, "Move your monthly investment there");
  assert.equal(v.end_month, 13);
});

test("a fork that takes the player's own option has no fork point and never diverges", () => {
  const v = resolveTokens(fork(save, d16, "D16-A"));
  for (const name of ["fork_decision", "fork_month", "real_choice", "ghost_choice", "first_divergent_month"]) assert.equal(v[name], null, name);
  assert.equal(v.identical_months, 24);
  assert.equal(v.substitution_count, 0);
  for (const name of ["substituted_decision", "substitution_month", "withdrawn_choice", "substitute_choice"]) assert.equal(v[name], null, name);
  for (const name of ["net_worth_gap", "safety_gap", "freedom_gap", "life_gap"]) assert.equal(v[name], 0, name);
});
