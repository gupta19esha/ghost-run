import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { fork } from "../../runner/fork.js";
import { resolveTokens, TOKENS, SUBSTITUTION_TOKENS } from "../tokens.js";
import { forksOf } from "../../agent/rank.js";
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

test("the middle of a run: D16-B, whose lead changes hands", () => {
  const demo = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));
  const v = resolveTokens(fork(demo, 15, "D16-B"));
  assert.equal(v.widest_gap_month, 22);
  assert.ok(v.widest_gap > 2500 && v.widest_gap < 2600, v.widest_gap);
  assert.equal(v.ghost_ahead_months, 10);
  assert.equal(v.crossover_month, 13);
  assert.equal(v.crossover_count, 2);
  assert.equal(v.layoff_month, 22);
  assert.equal(v.layoff_net_worth_gap, Math.round(v.layoff_ghost_net_worth) - Math.round(v.layoff_real_net_worth));
  assert.equal(typeof v.first_bar_apart, "string");
  assert.ok(v.first_bar_apart_month >= 10);
});

test("the middle of a run: D19-A never leads, so those tokens are null", () => {
  const demo = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));
  const result = fork(demo, 18, "D19-A");
  const v = resolveTokens(result);
  assert.equal(v.ghost_ahead_months, null);
  assert.equal(v.crossover_month, null);
  assert.equal(v.crossover_count, null);
  assert.equal(v.widest_gap_month, 22);
  assert.ok(v.widest_gap < -143000, v.widest_gap);
  // Independently: the widest month is the largest gap in the divergence
  const largest = result.divergence.reduce((a, b) => (Math.abs(b.netWorth) > Math.abs(a.netWorth) ? b : a));
  assert.equal(largest.month, v.widest_gap_month);
  // Independently: the lowest month is the lowest net worth on the ghost's own bars
  const lowest = result.ghost.bars.filter((b) => b.month > 13).reduce((a, b) => (b.netWorth < a.netWorth ? b : a));
  assert.equal(lowest.month, v.ghost_lowest_month);
  assert.ok(v.ghost_lowest_month > 13);
  assert.equal(v.layoff_real_net_worth, result.real.bars.find((b) => b.month === 22).netWorth);
  assert.equal(v.layoff_ghost_net_worth, result.ghost.bars.find((b) => b.month === 22).netWorth);
});

test("the ghost's lowest month comes after the split on every fork, and is null with no month left", () => {
  const demo = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));
  for (const f of forksOf(demo)) {
    const v = resolveTokens(f.fork);
    if (f.month === 24) assert.equal(v.ghost_lowest_month, null, f.option);
    else assert.ok(v.ghost_lowest_month > f.month, f.option);
  }
});

test("a ghost the rule ended before the layoff has no layoff tokens", () => {
  const v = resolveTokens(fork(save, d16, "D16-C", { substitution: "keep-real-or-stop" }));
  for (const name of ["layoff_month", "layoff_real_net_worth", "layoff_ghost_net_worth", "layoff_net_worth_gap"]) assert.equal(v[name], null, name);
});

test("a fork that never parts has no events, only the layoff", () => {
  const v = resolveTokens(fork(save, d16, "D16-A"));
  for (const name of ["widest_gap_month", "widest_gap", "ghost_ahead_months", "first_bar_apart_month", "first_bar_apart", "crossover_month", "crossover_count"]) assert.equal(v[name], null, name);
  assert.equal(v.layoff_net_worth_gap, 0);
  assert.equal(v.ghost_lowest_month, null);
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
