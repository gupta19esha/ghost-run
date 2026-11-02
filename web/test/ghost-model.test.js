import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readRun, forkView, checkAttempts, costList, surpriseList, reasons, markedDraft } from "../ghost-model.js";
import { narrateFork } from "../../agent/narration-loop.js";
import { forksOf } from "../../agent/rank.js";
import { fork } from "../../runner/fork.js";

const save = JSON.parse(readFileSync(new URL("../demo/save.json", import.meta.url), "utf8"));
const forks = forksOf(save).map(({ fork: _, ...summary }) => summary);
const served = async (result, env = {}) => (await narrateFork(result, { provider: "stub", env })).attempts
  .map(({ number, narration, ok }) => ({ number, narration, ok }));

test("the run: 24 months, every choice placed in its month with what else was offered", () => {
  const run = readRun(save);
  assert.deepEqual(run.months.map((m) => m.month), Array.from({ length: 24 }, (_, i) => i + 1));
  const choices = run.months.flatMap((m) => m.choices);
  assert.deepEqual(choices.map((c) => c.chosen.option), save.choices);
  for (const c of choices) assert.ok(c.alternatives.length > 0 && c.situation);
  assert.equal(run.end.month, 24);
});

test("the browser's check of served attempts agrees with the server's, and renders the accepted one", async () => {
  const result = fork(save, 15, "D16-B");
  const checked = checkAttempts(result, await served(result, { NARRATE_STUB_MISTAKES: "1" }));
  assert.ok(checked.agrees);
  assert.deepEqual(checked.attempts.map((a) => a.ok), [false, true]);
  assert.equal(checked.accepted.number, 2);
  assert.match(checked.rendered, /^The same money, a different life\. /);
  assert.ok(!/[{}]/.test(checked.rendered));
});

test("a typed figure is one reason, and the draft marks it whole", async () => {
  const result = fork(save, 15, "D16-C");
  const [rejected] = checkAttempts(result, await served(result, { NARRATE_STUB_MISTAKES: "1" })).rejected;
  const typed = reasons(rejected).filter((r) => r.rule === "numeral");
  assert.equal(typed.length, 1);
  assert.ok(typed[0].count >= 2, "2,359 is two digit runs to verify()");
  const parts = markedDraft(rejected.narration, rejected.failures);
  assert.deepEqual(parts.filter((p) => p.mark).map((p) => p.text), ["2,359"]);
  assert.equal(parts.map((p) => p.text).join(""), rejected.narration);
});

test("a narration that skips the same-money lead is rejected for it", () => {
  const result = fork(save, 15, "D16-B");
  const checked = checkAttempts(result, [{ number: 1, ok: false,
    narration: "In month {fork_month} the ghost took {ghost_choice}. In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}." }]);
  assert.deepEqual(checked.rejected[0].failures.map((f) => f.rule), ["lead"]);
  assert.equal(checked.rendered, null);
  assert.ok(checked.agrees);
});

test("the D16 fork: same money, the substitution noticed on the chart", () => {
  const view = forkView(save, 15, "D16-B");
  assert.equal(view.sameMoney, "freedom");
  assert.deepEqual(view.notices.map((n) => n.month), [14]);
  assert.match(view.notices[0].text, /was not on the table on this path/);
  assert.equal(forkView(save, 1, "D02-C").sameMoney, null);
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
