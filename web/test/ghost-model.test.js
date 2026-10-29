import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readRun, forkView, costList, surpriseList, placeholderNarration } from "../ghost-model.js";
import { forksOf } from "../../agent/rank.js";
import { fork } from "../../runner/fork.js";
import { verify } from "../../verify/verify.js";

const save = JSON.parse(readFileSync(new URL("../demo/save.json", import.meta.url), "utf8"));
const forks = forksOf(save).map(({ fork: _, ...summary }) => summary);

test("the run: 24 months, every choice placed in its month with what else was offered", () => {
  const run = readRun(save);
  assert.deepEqual(run.months.map((m) => m.month), Array.from({ length: 24 }, (_, i) => i + 1));
  const choices = run.months.flatMap((m) => m.choices);
  assert.deepEqual(choices.map((c) => c.chosen.option), save.choices);
  for (const c of choices) assert.ok(c.alternatives.length > 0 && c.situation);
  assert.equal(run.end.month, 24);
});

test("every fork of the demo: the placeholder passes verify(), and the view is verify()'s own output", () => {
  for (const f of forks) {
    const view = forkView(save, f.monthIndex, f.option);
    const again = verify(placeholderNarration(view.result), fork(save, f.monthIndex, f.option));
    assert.deepEqual(view.verification, again, `${f.option}`);
    assert.ok(view.verification.ok, `${f.option}: ${JSON.stringify(view.verification.failures)}`);
    assert.ok(view.rendered && !/[{}]/.test(view.rendered));
  }
});

test("the substitution fork names it on the chart and in the narration", () => {
  const view = forkView(save, 15, "D16-B");
  assert.deepEqual(view.notices.map((n) => n.month), [14]);
  assert.match(view.notices[0].text, /was not on the table on this path/);
  assert.ok(view.verification.figures.some((f) => f.token === "withdrawn_choice"));
});

test("a fork without substitutions has no notice and no substitution sentence", () => {
  const view = forkView(save, 1, "D02-C");
  assert.deepEqual(view.notices, []);
  assert.doesNotMatch(view.narration, /substitution|withdrawn/);
});

test("the lists: one alternative per choice, cost by money gained, surprise by its score", () => {
  const cost = costList(forks);
  const surprise = surpriseList(forks);
  for (const list of [cost, surprise]) {
    assert.equal(new Set(list.map((f) => f.monthIndex)).size, list.length);
    assert.ok(list.length > 0 && list.length <= 5);
  }
  assert.ok(cost.every((f, i) => f.features.end.netWorth > 0 && (i === 0 || cost[i - 1].score >= f.score)));
  assert.equal(cost[0].option, "D02-C");
  assert.ok(surprise.every((f, i) => i === 0 || surprise[i - 1].score >= f.score));
});
